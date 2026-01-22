import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import Footer from "@features/editor/components/Footer";

const DOC = { width: 3840, height: 2160 };
const PADDING = 32;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

export default function Editor() {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const stageRef = useRef<Konva.Stage | null>(null);

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
			(vw - PADDING * 2) / DOC.width,
			(vh - PADDING * 2) / DOC.height,
		);
		return clamp(s, MIN_SCALE, MAX_SCALE);
	}, []);

	const centerPage = useCallback((vw: number, vh: number, s: number) => {
		setPos({
			x: (vw - DOC.width * s) / 2,
			y: (vh - DOC.height * s) / 2,
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

	return (
		<main className="flex h-full w-full min-h-0 flex-col bg-slate-50 [grid-area:editor]">
			<section className="flex flex-1 min-h-0 overflow-hidden">
				{/* workspace：灰底，不要用虛線框 */}
				<div ref={containerRef} className="h-full w-full bg-slate-100">
					<Stage
						ref={stageRef}
						width={viewport.width}
						height={viewport.height}
						onWheel={handleWheel}
						className="cursor-crosshair"
					>
						{/* Page Layer：縮放與平移都作用在這層 */}
						<Layer
							x={pos.x}
							y={pos.y}
							scaleX={scale}
							scaleY={scale}
							draggable
							onDragStart={() => setMode("custom")}
							onDragMove={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
						>
							{/* Page（固定 3840x2160），用陰影/邊框讓它像 Canva 的紙 */}
							<Rect
								width={DOC.width}
								height={DOC.height}
								fill="#ffffff"
								stroke="#cbd5e1"
								strokeWidth={1 / scale}
								dash={[6 / scale, 6 / scale]}
								shadowColor="#000"
								shadowBlur={16 / scale}
								shadowOpacity={0.12}
								shadowOffset={{ x: 0, y: 3 / scale }}
								listening={false}
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
