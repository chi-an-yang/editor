import { useCallback, useEffect, useRef, useState } from "react";
import { Layer, Line, Rect, Stage } from "react-konva";
import type Konva from "konva";

type Point = {
	x: number;
	y: number;
};

type LineStroke = {
	color: string;
	size: number;
	points: number[];
};

const Editor = () => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const stageRef = useRef<Konva.Stage | null>(null);
	const [brushColor, setBrushColor] = useState("#111827");
	const [brushSize, setBrushSize] = useState(6);
	const [lines, setLines] = useState<LineStroke[]>([]);
	const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
	const isDrawingRef = useRef(false);

	const updateStageSize = useCallback(() => {
		const container = containerRef.current;
		if (!container) {
			return;
		}

		const { width, height } = container.getBoundingClientRect();
		setStageSize({
			width: Math.max(1, Math.floor(width)),
			height: Math.max(1, Math.floor(height)),
		});
	}, []);

	useEffect(() => {
		updateStageSize();
		const observer = new ResizeObserver(() => updateStageSize());
		if (containerRef.current) {
			observer.observe(containerRef.current);
		}

		return () => observer.disconnect();
	}, [updateStageSize]);

	const getPointerPosition = (): Point | null => {
		const stage = stageRef.current;
		if (!stage) {
			return null;
		}

		const pointer = stage.getPointerPosition();
		if (!pointer) {
			return null;
		}

		return { x: pointer.x, y: pointer.y };
	};

	const handlePointerDown = () => {
		const pointer = getPointerPosition();
		if (!pointer) {
			return;
		}

		isDrawingRef.current = true;
		setLines((prevLines) => [
			...prevLines,
			{
				color: brushColor,
				size: brushSize,
				points: [pointer.x, pointer.y],
			},
		]);
	};

	const handlePointerMove = () => {
		if (!isDrawingRef.current) {
			return;
		}

		const pointer = getPointerPosition();
		if (!pointer) {
			return;
		}

		setLines((prevLines) => {
			const lastLine = prevLines[prevLines.length - 1];
			if (!lastLine) {
				return prevLines;
			}

			const updatedLine: LineStroke = {
				...lastLine,
				points: [...lastLine.points, pointer.x, pointer.y],
			};

			return [...prevLines.slice(0, -1), updatedLine];
		});
	};

	const handlePointerUp = () => {
		isDrawingRef.current = false;
	};

	const handleClear = () => {
		setLines([]);
	};

	return (
		<main className="flex h-full w-full flex-col bg-slate-50 [grid-area:editor]">
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4">
				<div>
					<h1 className="text-lg font-semibold text-slate-900">Editor 畫布</h1>
					<p className="text-sm text-slate-500">拖曳滑鼠或觸控筆開始在畫布上繪製。</p>
				</div>
				<div className="flex flex-wrap items-center gap-4">
					<label className="flex items-center gap-2 text-sm text-slate-600">
						<span>顏色</span>
						<input
							type="color"
							value={brushColor}
							onChange={(event) => setBrushColor(event.target.value)}
							className="h-9 w-9 rounded border border-slate-200"
						/>
					</label>
					<label className="flex items-center gap-2 text-sm text-slate-600">
						<span>筆刷</span>
						<input
							type="range"
							min={2}
							max={24}
							value={brushSize}
							onChange={(event) => setBrushSize(Number(event.target.value))}
							className="accent-slate-900"
						/>
						<span className="w-6 text-right text-xs text-slate-500">
							{brushSize}
						</span>
					</label>
					<button
						type="button"
						onClick={handleClear}
						className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
					>
						清除畫布
					</button>
				</div>
			</header>
			<section className="flex-1 p-6">
				<div
					ref={containerRef}
					className="h-full w-full rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm"
				>
					<Stage
						ref={stageRef}
						width={stageSize.width}
						height={stageSize.height}
						className="h-full w-full cursor-crosshair rounded-2xl"
						onPointerDown={handlePointerDown}
						onPointerMove={handlePointerMove}
						onPointerUp={handlePointerUp}
						onPointerLeave={handlePointerUp}
					>
						<Layer>
							<Rect
								width={stageSize.width}
								height={stageSize.height}
								fill="#ffffff"
								listening={false}
							/>
							{lines.map((line, index) => (
								<Line
									key={`${index}-${line.points.length}`}
									points={line.points}
									stroke={line.color}
									strokeWidth={line.size}
									lineCap="round"
									lineJoin="round"
								/>
							))}
						</Layer>
					</Stage>
				</div>
			</section>
		</main>
	);
};

export default Editor;
