import { useMemo, useState } from "react";
import { Box, FormControl, InputLabel, MenuItem, Select, Slider, TextField } from "@mui/material";
import Clock from "./components/Clock";
import Media from "./components/Media";
import QrCode from "./components/QrCode";
import Shape from "./components/Shape";
import Text from "./components/Text";
import Weather from "./components/Weather";
import WebPage from "./components/WebPage";
import type { MediaElement } from "@features/editor/context/EditorContext";
import { useEditorContext } from "@features/editor/context/EditorContext";

type MediaUpload = {
	id: string;
	name: string;
	type: MediaElement["type"];
	extension: string;
	src: string;
	previewSrc?: string;
	width: number;
	height: number;
};

const MEDIA_FORMATS = [
	{ label: "Music", extensions: ["mp3"] },
	{ label: "Video", extensions: ["mp4", "mov", "wmv", "3gp", "avi"] },
	{ label: "Image", extensions: ["png", "jpg", "jpeg", "bmp"] },
	{ label: "Document", extensions: ["pdf"] },
];

const MEDIA_ACCEPT = [
	"audio/mpeg",
	"video/mp4",
	"video/quicktime",
	"video/x-ms-wmv",
	"video/3gpp",
	"video/x-msvideo",
	"image/png",
	"image/jpeg",
	"image/bmp",
	"application/pdf",
].join(",");

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

const Widgets = () => {
	const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
	const [webPageUrl, setWebPageUrl] = useState("");
	const [webPageRefresh, setWebPageRefresh] = useState(0);
	const [webPageFontSize, setWebPageFontSize] = useState("100");
	const [qrCodeText, setQrCodeText] = useState("");
	const [mediaUploads, setMediaUploads] = useState<MediaUpload[]>([]);
	const {
		addTextElement,
		addHeadingElement,
		addWebPageElement,
		addQrCodeElement,
		addMediaElement,
	} = useEditorContext();
	const activeWidget = useMemo(
		() => WIDGETS.find((widget) => widget.id === activeWidgetId) ?? null,
		[activeWidgetId],
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

	const handleMediaUpload = (files: FileList | null) => {
		if (!files || files.length === 0) return;

		const allowedExtensions = new Set(
			MEDIA_FORMATS.flatMap((format) => format.extensions),
		);

		Array.from(files).forEach((file) => {
			const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
			if (!allowedExtensions.has(extension)) {
				return;
			}

			const isImage = ["png", "jpg", "jpeg", "bmp"].includes(extension);
			const isDocument = extension === "pdf";
			const isVideo = ["mp4", "mov", "wmv", "3gp", "avi"].includes(extension);
			const type: MediaElement["type"] = isImage
				? "image"
				: isDocument
					? "document"
					: isVideo
						? "video"
						: "audio";

			const src = URL.createObjectURL(file);
			const baseUpload = {
				id: crypto.randomUUID(),
				name: file.name,
				type,
				extension,
				src,
				width: isDocument ? 640 : 720,
				height: isDocument ? 800 : 480,
			};

			if (type === "image") {
				const img = new window.Image();
				img.onload = () => {
					const maxWidth = 960;
					const scale = Math.min(1, maxWidth / img.width);
					setMediaUploads((prev) => [
						{
							...baseUpload,
							width: Math.round(img.width * scale),
							height: Math.round(img.height * scale),
							previewSrc: src,
						},
						...prev,
					]);
				};
				img.onerror = () => {
					setMediaUploads((prev) => [baseUpload, ...prev]);
				};
				img.src = src;
				return;
			}

			setMediaUploads((prev) => [
				{
					...baseUpload,
					previewSrc: isDocument ? src : undefined,
				},
				...prev,
			]);
		});
	};

	const handleCreateMedia = (upload: MediaUpload) => {
		addMediaElement({
			type: upload.type,
			name: upload.name,
			src: upload.src,
			width: upload.width,
			height: upload.height,
		});
	};

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
					{activeWidget.id === "media" ? (
						<div className="flex flex-col gap-4">
							<label className="flex cursor-pointer flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-300">
								<span>上傳檔案</span>
								<span className="text-xs font-normal text-slate-500">
									點擊選擇檔案或拖曳到此區域
								</span>
								<input
									type="file"
									className="hidden"
									accept={MEDIA_ACCEPT}
									multiple
									onChange={(event) => {
										handleMediaUpload(event.target.files);
										event.target.value = "";
									}}
								/>
							</label>
							<div className="rounded-lg border border-dashed border-slate-200 bg-white p-4">
								<p className="text-xs font-semibold uppercase text-slate-400">
									檔案格式
								</p>
								<ul className="mt-2 space-y-1 text-xs text-slate-600">
									{MEDIA_FORMATS.map((format) => (
										<li key={format.label}>
											{format.label} : {format.extensions.join(", ")}
										</li>
									))}
								</ul>
							</div>
							<div className="rounded-lg border border-slate-200 bg-white p-4">
								<div className="flex items-center justify-between">
									<p className="text-sm font-semibold text-slate-700">
										上傳完成
									</p>
									<span className="text-xs text-slate-400">
										點擊加入畫布
									</span>
								</div>
								{mediaUploads.length === 0 ? (
									<p className="mt-3 text-xs text-slate-400">
										尚未上傳檔案。
									</p>
								) : (
									<div className="mt-3 grid gap-3">
										{mediaUploads.map((upload) => (
											<button
												key={upload.id}
												type="button"
												onClick={() => handleCreateMedia(upload)}
												className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-sm text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
											>
												{upload.type === "image" || upload.type === "document" ? (
													<div className="flex h-16 w-20 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white">
														{upload.previewSrc ? (
															<img
																src={upload.previewSrc}
																alt={upload.name}
																className="h-full w-full object-contain"
															/>
														) : (
															<span className="text-xs font-semibold text-slate-500">
																{upload.type === "document" ? "PDF" : "IMG"}
															</span>
														)}
													</div>
												) : (
													<div className="flex h-16 w-20 items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-500">
														{upload.type === "video" ? "VIDEO" : "AUDIO"}
													</div>
												)}
												<div className="flex flex-1 flex-col">
													<span className="font-semibold text-slate-700">
														{upload.name}
													</span>
													<span className="text-xs text-slate-500">
														.{upload.extension}
													</span>
												</div>
											</button>
										))}
									</div>
								)}
							</div>
						</div>
					) : null}
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
					<div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
						選擇畫布上的 {activeWidget.label} 元件後，這裡會顯示更完整的屬性設定。
					</div>
				</div>
			) : null}
		</aside>
	);
};

export default Widgets;
