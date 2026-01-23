import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage, Text as KonvaText, Transformer } from "react-konva";
import type Konva from "konva";
import Footer from "@features/editor/components/Footer";
import { DOC_DIMENSIONS, useEditorContext } from "@features/editor/context/EditorContext";

const PADDING = 32;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

export default function Editor() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const stageRef = useRef<Konva.Stage | null>(null);
	const transformerRef = useRef<Konva.Transformer | null>(null);
	const webPageTransformerRef = useRef<Konva.Transformer | null>(null);
	const textNodeRefs = useRef<Record<string, Konva.Text | null>>({});
	const webPageNodeRefs = useRef<Record<string, Konva.Rect | null>>({});
	const {
		textElements,
		selectedTextId,
		webPageElements,
		selectedWebPageId,
		selectTextElement,
		selectWebPageElement,
		updateTextElement,
		updateWebPageElement,
	} = useEditorContext();

	// viewport = Editor 可視區大小（不等於 DOC）
	const [viewport, setViewport] = useState({ width: 1, height: 1 });

	// scale = 顯示比例（1 = 100% = 3840x2160）
	const [scale, setScale] = useState(0.2);

	// pos = Page 在 viewport 內的位置（平移）
	const [pos, setPos] = useState({ x: 0, y: 0 });

	// mode = 是否維持 Fit 模式（容器 resize 時會重算 fit）
	const [mode, setMode] = useState<"fit" | "custom">("fit");

	const viewportCenter = useMemo(
		() => ({ x: viewport.width / 2, y: viewport.height / 2 }),
		[viewport.height, viewport.width],
	);

	const calcFit = useCallback((vw: number, vh: number) => {
		const s = Math.min(
			(vw - PADDING * 2) / DOC_DIMENSIONS.width,
			(vh - PADDING * 2) / DOC_DIMENSIONS.height,
		);
		return clamp(s, MIN_SCALE, MAX_SCALE);
	}, []);

	const centerPage = useCallback((vw: number, vh: number, s: number) => {
		setPos({
			x: (vw - DOC_DIMENSIONS.width * s) / 2,
			y: (vh - DOC_DIMENSIONS.height * s) / 2,
		});
	}, []);

	const fitToScreen = useCallback(() => {
		const c = containerRef.current;
		if (!c) return;

		const vw = Math.max(1, Math.floor(c.clientWidth));
		const vh = Math.max(1, Math.floor(c.clientHeight));
		setViewport({ width: vw, height: vh });

		const s = calcFit(vw, vh);
		setScale(s);
		centerPage(vw, vh, s);
		setMode("fit");
	}, [calcFit, centerPage]);

	const setZoomTo = useCallback(
		(nextScale: number, anchor = viewportCenter) => {
			const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);

			// 以 anchor（螢幕座標）為中心縮放：保持 anchor 下方的世界座標不變
			const world = {
				x: (anchor.x - pos.x) / scale,
				y: (anchor.y - pos.y) / scale,
			};

			setScale(s);
			setPos({
				x: anchor.x - world.x * s,
				y: anchor.y - world.y * s,
			});
			setMode("custom");
		},
		[pos.x, pos.y, scale, viewportCenter],
	);

	// Resize：若還在 fit 模式就重算；否則只更新 viewport
	useEffect(() => {
		const c = containerRef.current;
		if (!c) return;

		const update = () => {
			const vw = Math.max(1, Math.floor(c.clientWidth));
			const vh = Math.max(1, Math.floor(c.clientHeight));
			setViewport({ width: vw, height: vh });

			if (mode === "fit") {
				const s = calcFit(vw, vh);
				setScale(s);
				centerPage(vw, vh, s);
			}
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(c);
		return () => ro.disconnect();
	}, [calcFit, centerPage, mode]);

	// Ctrl + 滾輪：以滑鼠位置為 anchor 縮放（像 Canva / Figma）
	const handleWheel = useCallback(
		(e: Konva.KonvaEventObject<WheelEvent>) => {
			e.evt.preventDefault();
			if (!e.evt.ctrlKey) return;

			const stage = stageRef.current;
			if (!stage) return;

			const pointer = stage.getPointerPosition();
			if (!pointer) return;

			const factor = 1.08;
			const direction = e.evt.deltaY > 0 ? -1 : 1;
			const next = direction > 0 ? scale * factor : scale / factor;

			setZoomTo(next, pointer);
		},
		[scale, setZoomTo],
	);

	const zoomPercent = Math.round(scale * 100);
	const handleZoomChange = useCallback(
		(nextPercent: number) => {
			setZoomTo(nextPercent / 100);
		},
		[setZoomTo],
	);

	useEffect(() => {
		const transformer = transformerRef.current;
		if (!transformer) return;
		if (!selectedTextId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = textNodeRefs.current[selectedTextId];
		if (node) {
			transformer.nodes([node]);
			transformer.getLayer()?.batchDraw();
		}
	}, [selectedTextId]);

	useEffect(() => {
		const transformer = webPageTransformerRef.current;
		if (!transformer) return;
		if (!selectedWebPageId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = webPageNodeRefs.current[selectedWebPageId];
		if (node) {
			transformer.nodes([node]);
			transformer.getLayer()?.batchDraw();
		}
	}, [selectedWebPageId]);

	const startEditingText = useCallback(
		(target: Konva.Text, elementId: string) => {
			const stage = stageRef.current;
			if (!stage) return;

			const container = stage.container();
			const textarea = document.createElement("textarea");
			const textPosition = target.getAbsolutePosition();
			const scale = target.getAbsoluteScale();
			const stageBox = container.getBoundingClientRect();

			textarea.value = target.text();
			textarea.style.position = "absolute";
			textarea.style.top = `${stageBox.top + textPosition.y}px`;
			textarea.style.left = `${stageBox.left + textPosition.x}px`;
			textarea.style.width = `${target.width() * scale.x}px`;
			textarea.style.height = `${target.height() * scale.y + 8}px`;
			textarea.style.fontSize = `${target.fontSize() * scale.y}px`;
			textarea.style.fontFamily = target.fontFamily();
			textarea.style.fontStyle = target.fontStyle();
			textarea.style.color = target.fill();
			textarea.style.lineHeight = target.lineHeight().toString();
			textarea.style.border = "1px solid #94a3b8";
			textarea.style.padding = "4px 6px";
			textarea.style.margin = "0";
			textarea.style.background = "white";
			textarea.style.outline = "none";
			textarea.style.resize = "none";
			textarea.style.transformOrigin = "left top";
			textarea.style.textAlign = target.align();
			textarea.style.boxSizing = "border-box";
			textarea.style.borderRadius = "6px";

			document.body.appendChild(textarea);
			textarea.focus();

			const commit = () => {
				updateTextElement(elementId, { text: textarea.value });
				document.body.removeChild(textarea);
			};

			const cancel = () => {
				document.body.removeChild(textarea);
			};

			textarea.addEventListener("keydown", (event) => {
				if (event.key === "Enter" && !event.shiftKey) {
					event.preventDefault();
					commit();
				}
				if (event.key === "Escape") {
					event.preventDefault();
					cancel();
				}
			});

			textarea.addEventListener("blur", () => {
				commit();
			});
		},
		[updateTextElement],
	);

	const selectedText = useMemo(
		() => textElements.find((item) => item.id === selectedTextId) ?? null,
		[selectedTextId, textElements],
	);

	const toggleFontStyle = useCallback(
		(style: "bold" | "italic") => {
			if (!selectedText) return;
			const styles = new Set(selectedText.fontStyle.split(" ").filter(Boolean));
			if (styles.has(style)) {
				styles.delete(style);
			} else {
				styles.add(style);
			}
			const next = styles.size ? Array.from(styles).join(" ") : "normal";
			updateTextElement(selectedText.id, { fontStyle: next });
		},
		[selectedText, updateTextElement],
	);

	const toggleDecoration = useCallback(() => {
		if (!selectedText) return;
		updateTextElement(selectedText.id, {
			textDecoration: selectedText.textDecoration ? "" : "underline",
		});
	}, [selectedText, updateTextElement]);

	return (
		<main className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-slate-50 [grid-area:editor]">
			<section className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
				{/* workspace：灰底，不要用虛線框 */}
				<div
					ref={containerRef}
					className="relative h-full w-full bg-slate-100"
				>
					{selectedText ? (
						<div className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
							<div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
								<button
									type="button"
									className="rounded px-2 py-1 font-semibold text-slate-600 hover:bg-slate-200"
									onClick={() =>
										updateTextElement(selectedText.id, {
											fontSize: Math.max(8, selectedText.fontSize - 1),
										})
									}
								>
									A-
								</button>
								<span className="w-8 text-center text-xs font-semibold">
									{selectedText.fontSize}
								</span>
								<button
									type="button"
									className="rounded px-2 py-1 font-semibold text-slate-600 hover:bg-slate-200"
									onClick={() =>
										updateTextElement(selectedText.id, {
											fontSize: Math.min(120, selectedText.fontSize + 1),
										})
									}
								>
									A+
								</button>
							</div>
							<button
								type="button"
								className={`rounded px-2 py-1 font-semibold ${
									selectedText.fontStyle.includes("bold")
										? "bg-slate-900 text-white"
										: "text-slate-600 hover:bg-slate-200"
								}`}
								onClick={() => toggleFontStyle("bold")}
							>
								B
							</button>
							<button
								type="button"
								className={`rounded px-2 py-1 italic ${
									selectedText.fontStyle.includes("italic")
										? "bg-slate-900 text-white"
										: "text-slate-600 hover:bg-slate-200"
								}`}
								onClick={() => toggleFontStyle("italic")}
							>
								I
							</button>
							<button
								type="button"
								className={`rounded px-2 py-1 underline ${
									selectedText.textDecoration
										? "bg-slate-900 text-white"
										: "text-slate-600 hover:bg-slate-200"
								}`}
								onClick={toggleDecoration}
							>
								U
							</button>
							<div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
								{(["left", "center", "right"] as const).map((align) => (
									<button
										key={align}
										type="button"
										className={`rounded px-2 py-1 text-xs font-semibold ${
											selectedText.align === align
												? "bg-slate-900 text-white"
												: "text-slate-600 hover:bg-slate-200"
										}`}
										onClick={() =>
											updateTextElement(selectedText.id, { align })
										}
									>
										{align === "left"
											? "L"
											: align === "center"
												? "C"
												: "R"}
									</button>
								))}
							</div>
						</div>
					) : null}
					<Stage
						ref={stageRef}
						width={viewport.width}
						height={viewport.height}
						onWheel={handleWheel}
						className="cursor-default"
						onMouseDown={(event) => {
							if (event.target === event.target.getStage()) {
								selectTextElement(null);
								selectWebPageElement(null);
								return;
							}
							if (event.target.name() === "page") {
								selectTextElement(null);
								selectWebPageElement(null);
							}
						}}
					>
						{/* Page Layer：縮放與平移都作用在這層 */}
						<Layer
							x={pos.x}
							y={pos.y}
							scaleX={scale}
							scaleY={scale}
						>
							{/* Page（固定 3840x2160），用陰影/邊框讓它像 Canva 的紙 */}
							<Rect
								width={DOC_DIMENSIONS.width}
								height={DOC_DIMENSIONS.height}
								fill="#ffffff"
								stroke="#cbd5e1"
								strokeWidth={1 / scale}
								dash={[6 / scale, 6 / scale]}
								shadowColor="#000"
								shadowBlur={16 / scale}
								shadowOpacity={0.12}
								shadowOffset={{ x: 0, y: 3 / scale }}
								listening={false}
								name="page"
							/>
							{textElements.map((item) => (
								<KonvaText
									key={item.id}
									ref={(node) => {
										textNodeRefs.current[item.id] = node;
									}}
									text={item.text}
									x={item.x}
									y={item.y}
									width={item.width}
									fontSize={item.fontSize}
									fontFamily={item.fontFamily}
									fontStyle={item.fontStyle}
									textDecoration={item.textDecoration}
									align={item.align}
									fill={item.fill}
									draggable
									onClick={() => {
										selectTextElement(item.id);
										selectWebPageElement(null);
										const node = textNodeRefs.current[item.id];
										if (node) startEditingText(node, item.id);
									}}
									onTap={() => {
										selectTextElement(item.id);
										selectWebPageElement(null);
										const node = textNodeRefs.current[item.id];
										if (node) startEditingText(node, item.id);
									}}
									onDragEnd={(event) => {
										updateTextElement(item.id, {
											x: event.target.x(),
											y: event.target.y(),
										});
									}}
								/>
							))}
							{webPageElements.map((item) => (
								<Fragment key={item.id}>
									<Rect
										ref={(node) => {
											webPageNodeRefs.current[item.id] = node;
										}}
										x={item.x}
										y={item.y}
										width={item.width}
										height={item.height}
										fill="#f8fafc"
										stroke="#94a3b8"
										strokeWidth={2 / scale}
										cornerRadius={12 / scale}
										draggable
										onClick={() => {
											selectWebPageElement(item.id);
											selectTextElement(null);
										}}
										onTap={() => {
											selectWebPageElement(item.id);
											selectTextElement(null);
										}}
										onDragEnd={(event) => {
											updateWebPageElement(item.id, {
												x: event.target.x(),
												y: event.target.y(),
											});
										}}
										onTransformEnd={(event) => {
											const node = event.target as Konva.Rect;
											const scaleX = node.scaleX();
											const scaleY = node.scaleY();
											node.scaleX(1);
											node.scaleY(1);
											const nextWidth = Math.max(200, node.width() * scaleX);
											const nextHeight = Math.max(120, node.height() * scaleY);
											updateWebPageElement(item.id, {
												x: node.x(),
												y: node.y(),
												width: nextWidth,
												height: nextHeight,
											});
										}}
									/>
									<KonvaText
										text={item.url}
										x={item.x}
										y={item.y}
										width={item.width}
										height={item.height}
										align="center"
										verticalAlign="middle"
										fontSize={48}
										fill="#334155"
										listening={false}
									/>
								</Fragment>
							))}
							<Transformer
								ref={transformerRef}
								rotateEnabled={false}
								enabledAnchors={[]}
								boundBoxFunc={(oldBox) => oldBox}
							/>
							<Transformer
								ref={webPageTransformerRef}
								rotateEnabled={false}
								enabledAnchors={[
									"top-left",
									"top-right",
									"bottom-left",
									"bottom-right",
								]}
								boundBoxFunc={(_, newBox) => {
									const minWidth = 200;
									const minHeight = 120;
									if (newBox.width < minWidth || newBox.height < minHeight) {
										return {
											...newBox,
											width: Math.max(newBox.width, minWidth),
											height: Math.max(newBox.height, minHeight),
										};
									}
									return newBox;
								}}
							/>
						</Layer>
					</Stage>
				</div>
			</section>

			<Footer
				zoomPercent={zoomPercent}
				onZoomChange={handleZoomChange}
				onFit={fitToScreen}
				onReset={() => {
					const c = containerRef.current;
					if (!c) return;
					setScale(1);
					centerPage(viewport.width, viewport.height, 1);
					setMode("custom");
				}}
			/>
		</main>
	);
}
