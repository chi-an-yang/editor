import { useMemo, useState } from "react";
import { Box, FormControl, InputLabel, MenuItem, Select, Slider, TextField } from "@mui/material";
import Clock from "./components/Clock";
import Media from "./components/Media";
import QrCode from "./components/QrCode";
import Shape from "./components/Shape";
import Text from "./components/Text";
import Weather from "./components/Weather";
import WebPage from "./components/WebPage";
import { useEditorContext } from "@features/editor/context/EditorContext";

const WIDGETS = [
	{
		id: "media",
		label: "Media",
		description: "新增圖片、影片或音訊到畫布中。",
		Component: Media,
	},
	{
		id: "text",
		label: "Text",
		description: "調整文字內容、字體與排版屬性。",
		Component: Text,
	},
	{
		id: "webpage",
		label: "Web Page",
		description: "嵌入網頁內容與顯示範圍設定。",
		Component: WebPage,
	},
	{
		id: "weather",
		label: "Weather",
		description: "設定天氣資訊來源與顯示樣式。",
		Component: Weather,
	},
	{
		id: "clock",
		label: "Clock",
		description: "調整時間格式、時區與顯示風格。",
		Component: Clock,
	},
	{
		id: "qrcode",
		label: "QR Code",
		description: "設定 QR Code 文字內容（背景透明）。",
		Component: QrCode,
	},
	{
		id: "shape",
		label: "Shape",
		description: "新增圖形並調整顏色、邊框與尺寸。",
		Component: Shape,
	},
] as const;

const SHAPE_OPTIONS = [
	{
		id: "rectangle",
		label: "矩形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<rect x="6" y="6" width="28" height="28" rx="4" />
			</svg>
		),
	},
	{
		id: "circle",
		label: "圓形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<circle cx="20" cy="20" r="14" />
			</svg>
		),
	},
	{
		id: "triangle",
		label: "三角形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<polygon points="20,6 34,32 6,32" />
			</svg>
		),
	},
] as const;

const Widgets = () => {
	const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
	const [webPageUrl, setWebPageUrl] = useState("");
	const [webPageRefresh, setWebPageRefresh] = useState(0);
	const [webPageFontSize, setWebPageFontSize] = useState("100");
	const [qrCodeText, setQrCodeText] = useState("");
	const {
		addTextElement,
		addHeadingElement,
		addWebPageElement,
		addQrCodeElement,
		addShapeElement,
		shapeElements,
		selectedShapeId,
		updateShapeElement,
	} = useEditorContext();
	const activeWidget = useMemo(
		() => WIDGETS.find((widget) => widget.id === activeWidgetId) ?? null,
		[activeWidgetId],
	);
	const selectedShape = useMemo(
		() => shapeElements.find((item) => item.id === selectedShapeId) ?? null,
		[shapeElements, selectedShapeId],
	);

	const refreshOptions = [
		{ value: 0, label: "Auto" },
		{ value: 10, label: "10 min" },
		{ value: 30, label: "30 min" },
		{ value: 60, label: "60 min" },
		{ value: 120, label: "120 min" },
		{ value: 180, label: "180 min" },
		{ value: 360, label: "360 min" },
	];

	const fontSizeOptions = [
		{ value: "75", label: "75%" },
		{ value: "100", label: "100%" },
		{ value: "125", label: "125%" },
		{ value: "150", label: "150%" },
		{ value: "175", label: "175%" },
		{ value: "200", label: "200%" },
	];

	return (
		<aside className="flex h-full bg-zinc-300 [grid-area:widgets]">
			<div className="flex h-full w-[4.5rem] flex-col items-center gap-2 p-2">
				{WIDGETS.map(({ id, Component, label }) => (
					<Component
						key={id}
						isActive={activeWidgetId === id}
						onClick={() =>
							setActiveWidgetId((current) => (current === id ? null : id))
						}
						ariaLabel={label}
					/>
				))}
			</div>
			{activeWidget ? (
				<div className="relative flex h-full w-[360px] flex-col gap-4 border-l border-slate-200 bg-white p-4">
					<button
						type="button"
						className="absolute -right-3 top-1/2 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-700"
						onClick={() => setActiveWidgetId(null)}
						aria-label="Collapse properties"
						title="Collapse properties"
					>
						<span className="text-base">‹</span>
					</button>
					<div>
						<p className="text-xs font-semibold uppercase text-slate-400">
							Properties
						</p>
						<h2 className="mt-1 text-lg font-semibold text-slate-800">
							{activeWidget.label}
						</h2>
					</div>
					<p className="text-sm leading-relaxed text-slate-600">
						{activeWidget.description}
					</p>
					{activeWidget.id === "text" ? (
						<div className="rounded-lg border border-slate-200 bg-white p-4">
							<div className="flex items-center justify-between gap-2">
								<div>
									<p className="text-sm font-semibold text-slate-700">
										建立文字段落
									</p>
									<p className="mt-1 text-xs text-slate-500">
										以 1080p 的 24px 為基準，依畫布高度等比放大。
									</p>
								</div>
								<button
									type="button"
									onClick={addTextElement}
									className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
								>
									T
								</button>
							</div>
							<div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
								<div>
									<p className="text-sm font-semibold text-slate-700">
										建立標題文字
									</p>
									<p className="mt-1 text-xs text-slate-500">
										以 1080p 的 60px 為基準，等比放大成標題尺寸。
									</p>
								</div>
								<button
									type="button"
									onClick={addHeadingElement}
									className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
								>
									H
								</button>
							</div>
						</div>
					) : null}
					{activeWidget.id === "webpage" ? (
						<Box className="rounded-lg border border-slate-200 bg-white p-4">
							<Box className="flex flex-col gap-3">
								<TextField
									label="Online URL"
									placeholder="https://example.com"
									value={webPageUrl}
									onChange={(event) => setWebPageUrl(event.target.value)}
									size="small"
									fullWidth
								/>
								<Box className="flex flex-col gap-2">
									<p className="text-sm font-medium text-slate-700">
										Auto Refresh
									</p>
									<Slider
										value={webPageRefresh}
										min={0}
										max={360}
										step={10}
										marks={refreshOptions}
										valueLabelDisplay="auto"
										valueLabelFormat={(value) => {
											if (value === 0) return "Auto";
											return `${value} min`;
										}}
										onChange={(_, value) => {
											if (typeof value === "number") {
												setWebPageRefresh(value);
											}
										}}
									/>
								</Box>
								<FormControl fullWidth size="small">
									<InputLabel id="webpage-fontsize-label">
										Font size
									</InputLabel>
									<Select
										labelId="webpage-fontsize-label"
										label="Font size"
										value={webPageFontSize}
										onChange={(event) =>
											setWebPageFontSize(String(event.target.value))
										}
									>
										{fontSizeOptions.map((option) => (
											<MenuItem key={option.value} value={option.value}>
												{option.label}
											</MenuItem>
										))}
									</Select>
								</FormControl>
								<button
									type="button"
									onClick={() => addWebPageElement(webPageUrl)}
									disabled={!webPageUrl.trim()}
									className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
								>
									新增 16:9 區塊
								</button>
							</Box>
						</Box>
					) : null}
					{activeWidget.id === "qrcode" ? (
						<Box className="rounded-lg border border-slate-200 bg-white p-4">
							<Box className="flex flex-col gap-3">
								<TextField
									label="Text only"
									placeholder="https://example.com"
									value={qrCodeText}
									onChange={(event) => setQrCodeText(event.target.value)}
									size="small"
									fullWidth
									helperText="Background is transparent."
								/>
								<button
									type="button"
									onClick={() => {
										addQrCodeElement(qrCodeText.trim());
										setQrCodeText("");
									}}
									disabled={!qrCodeText.trim()}
									className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
								>
									新增 QR Code
								</button>
							</Box>
						</Box>
					) : null}
					{activeWidget.id === "shape" ? (
						<Box className="rounded-lg border border-slate-200 bg-white p-4">
							<Box className="flex flex-col gap-4">
								<div className="space-y-2">
									<p className="text-sm font-semibold text-slate-700">
										新增基本圖形
									</p>
									<div className="flex flex-wrap gap-2">
										{SHAPE_OPTIONS.map((option) => (
											<button
												key={option.id}
												type="button"
												onClick={() => addShapeElement(option.id)}
												className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-slate-900 text-white transition hover:bg-slate-800"
												aria-label={option.label}
												title={option.label}
											>
												{option.icon}
											</button>
										))}
									</div>
								</div>
								<div className="space-y-2">
									<p className="text-sm font-semibold text-slate-700">
										圖形顏色
									</p>
									{selectedShape ? (
										<div className="flex items-center gap-3">
											<input
												type="color"
												className="h-10 w-10 cursor-pointer rounded border border-slate-200"
												value={selectedShape.fill}
												onChange={(event) =>
													updateShapeElement(selectedShape.id, {
														fill: event.target.value,
													})
												}
												aria-label="Shape color"
											/>
											<input
												type="text"
												className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
												value={selectedShape.fill.toUpperCase()}
												onChange={(event) =>
													updateShapeElement(selectedShape.id, {
														fill: event.target.value,
													})
												}
											/>
										</div>
									) : (
										<p className="text-xs text-slate-500">
											先在畫布上點選圖形後即可調整顏色。
										</p>
									)}
								</div>
							</Box>
						</Box>
					) : null}
					<div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
						選擇畫布上的 {activeWidget.label} 元件後，這裡會顯示更完整的屬性設定。
					</div>
				</div>
			) : null}
		</aside>
	);
};

export default Widgets;
