import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { Box, FormControl, InputLabel, MenuItem, Select, Slider, TextField } from "@mui/material";
import Clock from "./components/Clock";
import Media from "./components/Media";
import QrCode from "./components/QrCode";
import Shape from "./components/Shape";
import Text from "./components/Text";
import Weather from "./components/Weather";
import WebPage from "./components/WebPage";
import YouTube from "./components/YouTube";
import {
	CLOCK_DEFAULT_SIZE,
	useEditorContext,
	type ClockTheme,
	type ClockWidget,
	type WeatherWidget,
	type MediaKind,
	type ShapeElement,
	type ShapeType,
	type Widget,
} from "@features/editor/context/EditorContext";

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
		id: "youtube",
		label: "YouTube",
		description: "設定播放來源、清單或單支影片。",
		Component: YouTube,
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

const SHAPE_OPTIONS: Array<{ id: ShapeType; label: string; icon: ReactNode }> = [
	{
		id: "rectangle",
		label: "矩形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<rect x="6" y="12" width="28" height="16" rx="2" />
			</svg>
		),
	},
	{
		id: "rounded-rectangle",
		label: "圓角矩形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<rect x="6" y="10" width="28" height="20" rx="6" />
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
	{
		id: "triangle-inverted",
		label: "倒三角",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<polygon points="6,8 34,8 20,32" />
			</svg>
		),
	},
	{
		id: "diamond",
		label: "菱形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<polygon points="20,6 34,20 20,34 6,20" />
			</svg>
		),
	},
	{
		id: "plus",
		label: "十字",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<path d="M16 6h8v10h10v8H24v10h-8V24H6v-8h10z" />
			</svg>
		),
	},
	{
		id: "pentagon",
		label: "五邊形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<polygon points="20,6 34,16 28,34 12,34 6,16" />
			</svg>
		),
	},
	{
		id: "hexagon",
		label: "六邊形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<polygon points="12,6 28,6 34,20 28,34 12,34 6,20" />
			</svg>
		),
	},
	{
		id: "trapezoid",
		label: "梯形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<polygon points="10,8 30,8 36,32 4,32" />
			</svg>
		),
	},
	{
		id: "parallelogram",
		label: "平行四邊形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<polygon points="12,8 36,8 28,32 4,32" />
			</svg>
		),
	},
	{
		id: "right-triangle",
		label: "直角三角形",
		icon: (
			<svg viewBox="0 0 40 40" className="h-8 w-8 fill-current">
				<polygon points="6,8 34,32 6,32" />
			</svg>
		),
	},
];

const CLOCK_DISPLAY_OPTIONS = [
	{ value: "time", label: "Time" },
	{ value: "date", label: "Date" },
	{ value: "time-date-one-line", label: "Time, Date (One line)" },
	{ value: "time-date-two-lines", label: "Time, Date (Two lines)" },
	{ value: "date-time-one-line", label: "Date, Time (One line)" },
	{ value: "date-time-two-lines", label: "Date, Time (Two lines)" },
] as const;

const CLOCK_TIME_OPTIONS = [
	{ value: "24h-seconds", label: "23:59:59" },
	{ value: "12h-prefix", label: "PM 11:59" },
	{ value: "12h-seconds", label: "11:59:59 PM" },
	{ value: "12h", label: "11:59 PM" },
] as const;

const CLOCK_COLOR_OPTIONS = [
	"#ffffff",
	"#0f172a",
	"#1f2937",
	"#334155",
	"#475569",
	"#64748b",
	"#0f766e",
	"#16a34a",
	"#0ea5e9",
	"#6366f1",
	"#f97316",
	"#ef4444",
];

const CLOCK_PREVIEW_FONT_SIZE = 32;
const CLOCK_TEXT_LINE_HEIGHT = 1.2;
const ANALOG_PREVIEW_SIZE = 120;
const ANALOG_PREVIEW_HAND_SIZE = 110;
const ANALOG_PREVIEW_ANGLES = {
	hour: 300,
	minute: 60,
	second: 200,
} as const;
const ANALOG_PREVIEW_ASSETS = {
	light: {
		circle: "/assets/images/clock-circle_white.png",
		dial: "/assets/images/clock-dial_white.png",
		hour: "/assets/images/clock_hour_white.png",
		minute: "/assets/images/clock_minute_white.png",
		second: "/assets/images/clock_second_white.png",
	},
	dark: {
		circle: "/assets/images/clock-circle_black.png",
		dial: "/assets/images/clock-dial_black.png",
		hour: "/assets/images/clock_hour_black.png",
		minute: "/assets/images/clock_minute_black.png",
		second: "/assets/images/clock_second_black.png",
	},
} as const;

const getClockFittedFontSize = (
	lines: string[],
	{ width, height }: typeof CLOCK_DEFAULT_SIZE,
	fallbackSize = 28,
) => {
	if (typeof document === "undefined" || !lines.length) return fallbackSize;
	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	if (!context) return fallbackSize;
	let low = 1;
	let high = 1024;
	let best = fallbackSize;
	while (low <= high) {
		const mid = Math.floor((low + high) / 2);
		context.font = `bold ${mid}px Noto Sans TC`;
		const maxWidth = Math.max(
			...lines.map((line) => context.measureText(line).width),
		);
		const totalHeight = lines.length * mid * CLOCK_TEXT_LINE_HEIGHT;
		if (maxWidth <= width && totalHeight <= height) {
			best = mid;
			low = mid + 1;
		} else {
			high = mid - 1;
		}
	}
	return best;
};

const buildClockTime = (
	date: Date,
	format: (typeof CLOCK_TIME_OPTIONS)[number]["value"],
) => {
	const hours = date.getHours();
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	const pad = (value: number) => String(value).padStart(2, "0");
	const hour12 = hours % 12 || 12;
	const meridiem = hours >= 12 ? "PM" : "AM";

	if (format === "24h-seconds") {
		return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
	}

	if (format === "12h-prefix") {
		return `${meridiem} ${pad(hour12)}:${pad(minutes)}`;
	}

	if (format === "12h-seconds") {
		return `${pad(hour12)}:${pad(minutes)}:${pad(seconds)} ${meridiem}`;
	}

	return `${pad(hour12)}:${pad(minutes)} ${meridiem}`;
};

const buildClockDate = (date: Date) => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
	return `${year}.${month}.${day} ${weekday}`;
};

const buildClockLines = (
	date: Date,
	displayFormat: (typeof CLOCK_DISPLAY_OPTIONS)[number]["value"],
	timeFormat: (typeof CLOCK_TIME_OPTIONS)[number]["value"],
) => {
	const timeText = buildClockTime(date, timeFormat);
	const dateText = buildClockDate(date);

	switch (displayFormat) {
		case "time":
			return [timeText];
		case "date":
			return [dateText];
		case "time-date-one-line":
			return [`${timeText} ${dateText}`];
		case "time-date-two-lines":
			return [timeText, dateText];
		case "date-time-one-line":
			return [`${dateText} ${timeText}`];
		case "date-time-two-lines":
			return [dateText, timeText];
		default:
			return [timeText];
	}
};

const isClockWidget = (widget: Widget | null): widget is ClockWidget =>
	widget?.type === "clock";

const isWeatherWidget = (widget: Widget | null): widget is WeatherWidget =>
	widget?.type === "weather";

const Widgets = () => {
	const [activeWidgetId, setActiveWidgetId] = useState<string | null>(null);
	const [clockType, setClockType] = useState<"digital" | "analog">("digital");
	const [clockNow, setClockNow] = useState(() => new Date());
	const [clockDisplayFormat, setClockDisplayFormat] = useState<
		(typeof CLOCK_DISPLAY_OPTIONS)[number]["value"]
	>("time");
	const [clockTimeFormat, setClockTimeFormat] = useState<
		(typeof CLOCK_TIME_OPTIONS)[number]["value"]
	>("24h-seconds");
	const [clockFontSize, setClockFontSize] = useState(() =>
		getClockFittedFontSize(
			buildClockLines(new Date(), "time", "24h-seconds"),
			CLOCK_DEFAULT_SIZE,
		),
	);
	const [isClockFontAuto, setIsClockFontAuto] = useState(true);
	const [clockTextColor, setClockTextColor] = useState("#0f172a");
	const [clockBackgroundColor, setClockBackgroundColor] = useState("transparent");
	const [clockTheme, setClockTheme] = useState<ClockTheme>("light");
	const [webPageUrl, setWebPageUrl] = useState("");
	const [webPageRefresh, setWebPageRefresh] = useState(0);
	const [webPageFontSize, setWebPageFontSize] = useState("100");
	const [youTubeSource, setYouTubeSource] = useState<"playlist" | "videos">(
		"playlist",
	);
	const [youTubePlaylistUrl, setYouTubePlaylistUrl] = useState("");
	const [youTubeVideos, setYouTubeVideos] = useState<string[]>([""]);
	const [qrCodeText, setQrCodeText] = useState("");
	const [weatherCity, setWeatherCity] = useState("");
	const [weatherCountry, setWeatherCountry] = useState("");
	const [weatherMainAreaStyle, setWeatherMainAreaStyle] = useState("square");
	const [weatherTextColor, setWeatherTextColor] = useState("#0f172a");
	const [weatherBackgroundColor, setWeatherBackgroundColor] = useState("#e2e8f0");
	const [mediaUploads, setMediaUploads] = useState<
		Array<{
			id: string;
			name: string;
			kind: MediaKind;
			extension: string;
			previewUrl?: string;
			width: number;
			height: number;
		}>
	>([]);
	const [mediaErrors, setMediaErrors] = useState<string[]>([]);
	const {
		addTextElement,
		addHeadingElement,
		addWebPageElement,
		addYouTubeElement,
		addQrCodeElement,
		addWeatherElement,
		addClockElement,
		addShapeElement,
		addMediaElement,
		selectedClockId,
		selectedWeatherId,
		textElements,
		selectedTextId,
		selectedWebPageId,
		selectedYouTubeId,
		selectedQrCodeId,
		shapeElements,
		selectedShapeId,
		selectedMediaId,
		selectedWidgetId,
		widgetsById,
		updateTextElement,
		updateClockElement,
		updateShapeElement,
		updateWidget,
	} = useEditorContext();
	const activeWidget = useMemo(
		() => WIDGETS.find((widget) => widget.id === activeWidgetId) ?? null,
		[activeWidgetId],
	);
	const selectedShape = useMemo(
		() => shapeElements.find((item: ShapeElement) => item.id === selectedShapeId) ?? null,
		[shapeElements, selectedShapeId],
	);
	const selectedText = useMemo(
		() => textElements.find((item) => item.id === selectedTextId) ?? null,
		[textElements, selectedTextId],
	);
	const selectedWidget = useMemo(() => {
		if (!selectedWidgetId) return null;
		return widgetsById[selectedWidgetId] ?? null;
	}, [selectedWidgetId, widgetsById]);
	const selectedClock = isClockWidget(selectedWidget) ? selectedWidget : null;
	const selectedWeather = isWeatherWidget(selectedWidget) ? selectedWidget : null;

	useEffect(() => {
		const nextWidget = (() => {
			if (selectedTextId) return "text";
			if (selectedWebPageId) return "webpage";
			if (selectedYouTubeId) return "youtube";
			if (selectedQrCodeId) return "qrcode";
			if (selectedWeatherId) return "weather";
			if (selectedClockId) return "clock";
			if (selectedShapeId) return "shape";
			if (selectedMediaId) return "media";
			return null;
		})();

		if (!nextWidget) return;
		setActiveWidgetId(nextWidget);
	}, [
		selectedClockId,
		selectedMediaId,
		selectedQrCodeId,
		selectedWeatherId,
		selectedShapeId,
		selectedTextId,
		selectedYouTubeId,
		selectedWebPageId,
	]);

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

	const textAnimationOptions = [
		{
			value: "horizontal",
			label: "Horizontal scrolling",
			description: "水平移動",
			previewClass: "group-hover:translate-x-4",
		},
		{
			value: "vertical",
			label: "Vertical scrolling",
			description: "垂直移動",
			previewClass: "group-hover:-translate-y-2",
		},
		{
			value: "static",
			label: "Static",
			description: "靜止顯示",
			previewClass: "group-hover:scale-105",
		},
	];

	const mediaExtensionMap: Record<string, MediaKind> = {
		mp3: "audio",
		mp4: "video",
		mov: "video",
		wmv: "video",
		"3gp": "video",
		avi: "video",
		png: "image",
		jpg: "image",
		jpeg: "image",
		bmp: "image",
		pdf: "document",
	};

	const loadImageSize = (url: string) =>
		new Promise<{ width: number; height: number }>((resolve, reject) => {
			const img = new window.Image();
			img.onload = () => resolve({ width: img.width, height: img.height });
			img.onerror = () => reject(new Error("Image load failed"));
			img.src = url;
		});

	const normalizeImageSize = (width: number, height: number) => {
		const maxWidth = 1200;
		const maxHeight = 1200;
		const scale = Math.min(1, maxWidth / width, maxHeight / height);
		return {
			width: Math.round(width * scale),
			height: Math.round(height * scale),
		};
	};

	useEffect(() => {
		if (activeWidgetId !== "clock" || clockType !== "digital") return;

		setClockNow(new Date());
		const timer = window.setInterval(() => {
			setClockNow(new Date());
		}, 1000);
		return () => window.clearInterval(timer);
	}, [activeWidgetId, clockType]);

	useEffect(() => {
		if (!isClockFontAuto) return;
		const nextSize = getClockFittedFontSize(
			buildClockLines(new Date(), clockDisplayFormat, clockTimeFormat),
			CLOCK_DEFAULT_SIZE,
			clockFontSize,
		);
		if (nextSize !== clockFontSize) {
			setClockFontSize(nextSize);
		}
	}, [clockDisplayFormat, clockTimeFormat, clockFontSize, isClockFontAuto]);

	useEffect(() => {
		if (!selectedClock) return;
		setClockType(selectedClock.props.type);
		setClockTheme(selectedClock.props.theme);
	}, [selectedClock]);

	useEffect(() => {
		if (!selectedWeather) return;
		setWeatherCity(selectedWeather.props.city);
		setWeatherCountry(selectedWeather.props.country);
		setWeatherMainAreaStyle(selectedWeather.props.mainAreaStyle);
		setWeatherTextColor(selectedWeather.props.textColor);
		setWeatherBackgroundColor(selectedWeather.props.backgroundColor);
	}, [selectedWeather]);

	const activeClockType = selectedClock?.props.type ?? clockType;
	const activeClockTheme = selectedClock?.props.theme ?? clockTheme;
	const activeClockDisplayFormat =
		selectedClock?.props.displayFormat ?? clockDisplayFormat;
	const activeClockTimeFormat =
		selectedClock?.props.timeFormat ?? clockTimeFormat;
	const activeClockFontSize = selectedClock?.props.fontSize ?? clockFontSize;
	const activeClockTextColor =
		selectedClock?.props.textColor ?? clockTextColor;
	const activeClockBackgroundColor =
		selectedClock?.props.backgroundColor ?? clockBackgroundColor;
	const activeWeatherCity = selectedWeather?.props.city ?? weatherCity;
	const activeWeatherCountry = selectedWeather?.props.country ?? weatherCountry;
	const activeWeatherMainAreaStyle =
		selectedWeather?.props.mainAreaStyle ?? weatherMainAreaStyle;
	const activeWeatherTextColor =
		selectedWeather?.props.textColor ?? weatherTextColor;
	const activeWeatherBackgroundColor =
		selectedWeather?.props.backgroundColor ?? weatherBackgroundColor;
	const hasSelection = Boolean(selectedWidgetId);
	const clockDisplayLines = useMemo(() => {
		return buildClockLines(clockNow, activeClockDisplayFormat, activeClockTimeFormat);
	}, [activeClockDisplayFormat, activeClockTimeFormat, clockNow]);

	const normalizeYouTubeVideos = (videos: string[]) =>
		videos.map((video) => video.trim()).filter(Boolean);

	const canAddYouTube =
		youTubeSource === "playlist"
			? Boolean(youTubePlaylistUrl.trim())
			: normalizeYouTubeVideos(youTubeVideos).length > 0;

	const clampTextSize = (value: number) =>
		Math.min(1024, Math.max(1, Math.round(value)));

	const handleYouTubeVideoChange = (index: number, value: string) => {
		setYouTubeVideos((prev) => {
			const next = [...prev];
			next[index] = value;
			const lastIndex = next.length - 1;
			if (index === lastIndex && value.trim()) {
				next.push("");
			}
			return next;
		});
	};

	const handleAddYouTubeElement = () => {
		const playlistUrl = youTubePlaylistUrl.trim();
		const videos =
			youTubeSource === "videos" ? normalizeYouTubeVideos(youTubeVideos) : [];
		addYouTubeElement({
			source: youTubeSource,
			playlistUrl: youTubeSource === "playlist" ? playlistUrl : "",
			videos,
		});
	};

	const handleAddWeatherElement = () => {
		addWeatherElement({
			city: activeWeatherCity.trim(),
			country: activeWeatherCountry.trim(),
			mainAreaStyle: activeWeatherMainAreaStyle,
			textColor: activeWeatherTextColor,
			backgroundColor: activeWeatherBackgroundColor,
		});
	};

	const handleWeatherCityChange = (value: string) => {
		setWeatherCity(value);
		if (!selectedWeather) return;
		updateWidget(selectedWeather.id, { city: value });
	};

	const handleWeatherCountryChange = (value: string) => {
		setWeatherCountry(value);
		if (!selectedWeather) return;
		updateWidget(selectedWeather.id, { country: value });
	};

	const handleWeatherMainAreaStyleChange = (value: string) => {
		setWeatherMainAreaStyle(value);
		if (!selectedWeather) return;
		updateWidget(selectedWeather.id, { mainAreaStyle: value });
	};

	const handleWeatherTextColorChange = (value: string) => {
		setWeatherTextColor(value);
		if (!selectedWeather) return;
		updateWidget(selectedWeather.id, { textColor: value });
	};

	const handleWeatherBackgroundColorChange = (value: string) => {
		setWeatherBackgroundColor(value);
		if (!selectedWeather) return;
		updateWidget(selectedWeather.id, { backgroundColor: value });
	};

	const handleMediaUpload = async (event: ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(event.target.files ?? []);
		if (!files.length) return;

		const nextErrors: string[] = [];
		const nextUploads = await Promise.all(
			files.map(async (file) => {
				const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
				const kind = mediaExtensionMap[extension];
				if (!kind) {
					nextErrors.push(file.name);
					return null;
				}

				const id = crypto.randomUUID();
				if (kind === "image") {
					const previewUrl = URL.createObjectURL(file);
					const size = await loadImageSize(previewUrl);
					const normalized = normalizeImageSize(size.width, size.height);
					return {
						id,
						name: file.name,
						kind,
						extension,
						previewUrl,
						width: normalized.width,
						height: normalized.height,
					};
				}

				if (kind === "video") {
					return {
						id,
						name: file.name,
						kind,
						extension,
						width: 640,
						height: 360,
					};
				}

				if (kind === "audio") {
					return {
						id,
						name: file.name,
						kind,
						extension,
						width: 600,
						height: 140,
					};
				}

				return {
					id,
					name: file.name,
					kind,
					extension,
					width: 520,
					height: 640,
				};
			}),
		);

		setMediaUploads((prev) => [
			...prev,
			...nextUploads.filter(
				(upload): upload is NonNullable<typeof upload> => Boolean(upload),
			),
		]);
		setMediaErrors(nextErrors);
		event.target.value = "";
	};

	return (
		<aside className="flex h-full min-h-0 bg-zinc-300 [grid-area:widgets]">
			<div className="flex h-full min-h-0 w-[4.5rem] flex-col items-center gap-2 p-2">
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
				<div className="relative flex h-full min-h-0 w-[360px] flex-col border-l border-slate-200 bg-white p-4">
					<button
						type="button"
						className="absolute -right-3 top-1/2 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-700"
						onClick={() => setActiveWidgetId(null)}
						aria-label="Collapse properties"
						title="Collapse properties"
					>
						<span className="text-base">‹</span>
					</button>
					<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
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
						{!hasSelection ? (
							<div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
								請先選取元件
							</div>
						) : null}
						{activeWidget.id === "media" ? (
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
									<label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800">
										上傳檔案
										<input
											type="file"
											className="sr-only"
											multiple
											accept=".mp3,.mp4,.mov,.wmv,.3gp,.avi,.png,.jpg,.jpeg,.bmp,.pdf"
											onChange={handleMediaUpload}
										/>
									</label>
									<p className="text-xs text-slate-500">
										檔案格式請參考：Music (mp3)、Video (mp4, mov, wmv(x),
										3gp(x), avi(x))、Image (png, jpg, jpeg, bmp)、Document
										(pdf)。
									</p>
									{mediaErrors.length ? (
										<p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
											以下檔案格式不支援：{mediaErrors.join("、")}
										</p>
									) : null}
								</div>
								<div className="rounded-lg border border-slate-200 bg-white p-4">
									<p className="text-sm font-semibold text-slate-700">
										上傳成功
									</p>
									<p className="mt-1 text-xs text-slate-500">
										點擊區塊即可在畫布建立 media 元素。
									</p>
								{mediaUploads.length ? (
									<div className="mt-3 grid grid-cols-2 gap-3">
										{mediaUploads.map((item) => (
											<button
												key={item.id}
												type="button"
												className="flex h-32 flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 text-left text-xs text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
												onClick={() =>
													addMediaElement({
														kind: item.kind,
														name: item.name,
														src:
															item.kind === "image"
																? item.previewUrl
																: undefined,
														width: item.width,
														height: item.height,
													})
												}
											>
												{item.kind === "image" && item.previewUrl ? (
													<img
														src={item.previewUrl}
														alt={item.name}
														className="h-16 w-full rounded-md object-cover"
													/>
												) : item.kind === "document" ? (
													<div className="flex h-16 w-full items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-xs font-semibold text-slate-500">
														PDF
													</div>
												) : (
													<div className="flex h-16 w-full items-center justify-center rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-500">
														{item.kind.toUpperCase()}
													</div>
												)}
												<span className="line-clamp-2 text-center text-[11px] text-slate-600">
													{item.name}
												</span>
											</button>
										))}
									</div>
								) : (
									<div className="mt-3 rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-400">
										尚未上傳檔案
									</div>
								)}
								</div>
							</div>
						) : null}
						{activeWidget.id === "text" ? (
							<div className="flex flex-col gap-4">
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
								<div className="rounded-lg border border-slate-200 bg-white p-4">
									<p className="text-sm font-semibold text-slate-700">
										文字屬性
									</p>
									{selectedText ? (
									<div className="mt-3 space-y-4">
										<div className="space-y-2">
											<p className="text-sm font-semibold text-slate-700">
												文字大小
											</p>
											<div className="flex items-center gap-3">
												<input
													type="number"
													min={1}
													max={1024}
													step={1}
													value={selectedText.fontSize}
													onChange={(event) => {
														const nextValue = event.target.valueAsNumber;
														if (Number.isNaN(nextValue)) return;
														const nextFontSize = clampTextSize(nextValue);
														const nextWidth =
															selectedText.width === undefined
																? undefined
																: selectedText.width *
																	(nextFontSize / selectedText.fontSize);
														updateTextElement(selectedText.id, {
															fontSize: nextFontSize,
															width: nextWidth,
														});
													}}
													className="w-24 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
												/>
												<span className="text-xs text-slate-500">
													1-1024
												</span>
											</div>
										</div>
										<div className="space-y-2">
											<p className="text-sm font-semibold text-slate-700">
												Text Background color
											</p>
											<div className="flex items-center gap-3">
												<input
													type="color"
													className="h-10 w-10 cursor-pointer rounded border border-slate-200"
													value={
														selectedText.backgroundColor === "transparent"
															? "#ffffff"
															: selectedText.backgroundColor
													}
													onChange={(event) =>
														updateTextElement(selectedText.id, {
															backgroundColor: event.target.value,
														})
													}
													aria-label="Text background color"
												/>
												<input
													type="text"
													className="w-full rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
													value={
														selectedText.backgroundColor === "transparent"
															? "TRANSPARENT"
															: selectedText.backgroundColor.toUpperCase()
													}
													onChange={(event) =>
														updateTextElement(selectedText.id, {
															backgroundColor: event.target.value,
														})
													}
												/>
											</div>
										</div>
										<div className="space-y-2">
											<p className="text-sm font-semibold text-slate-700">
												Animation indication
											</p>
											<div className="space-y-2">
												{textAnimationOptions.map((option) => (
													<button
														key={option.value}
														type="button"
														onClick={() =>
															updateTextElement(selectedText.id, {
																animation: option.value as
																	| "horizontal"
																	| "vertical"
																	| "static",
															})
														}
														className={`group flex min-h-[68px] w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition ${
															selectedText.animation === option.value
																? "border-slate-900 bg-slate-900/5"
																: "border-slate-200 bg-white hover:border-slate-400"
														}`}
													>
														<div>
															<p className="text-sm font-semibold text-slate-800">
																{option.label}
															</p>
															<p className="mt-1 text-xs text-slate-500">
																{option.description}
															</p>
														</div>
														<div className="relative h-10 w-20 overflow-hidden rounded-md bg-slate-100">
															<span
																className={`absolute left-3 top-1/2 h-2 w-8 -translate-y-1/2 rounded-full bg-slate-400 transition duration-300 ${option.previewClass}`}
															/>
														</div>
													</button>
												))}
											</div>
										</div>
									</div>
									) : (
									<p className="mt-2 text-xs text-slate-500">
										先在畫布上點選文字後即可調整屬性。
									</p>
									)}
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
					{activeWidget.id === "youtube" ? (
						<Box className="rounded-lg border border-slate-200 bg-white p-4">
							<Box className="flex flex-col gap-3">
								<FormControl fullWidth size="small">
									<InputLabel id="youtube-source-label">Source</InputLabel>
									<Select
										labelId="youtube-source-label"
										label="Source"
										value={youTubeSource}
										onChange={(event) =>
											setYouTubeSource(
												event.target.value === "videos"
													? "videos"
													: "playlist",
											)
										}
									>
										<MenuItem value="playlist">Playlist</MenuItem>
										<MenuItem value="videos">Videos</MenuItem>
									</Select>
								</FormControl>
								{youTubeSource === "playlist" ? (
									<TextField
										label="Playlist URL"
										placeholder="https://www.youtube.com/playlist?list=..."
										value={youTubePlaylistUrl}
										onChange={(event) =>
											setYouTubePlaylistUrl(event.target.value)
										}
										size="small"
										fullWidth
									/>
								) : (
									<Box className="flex flex-col gap-2">
										<p className="text-sm font-medium text-slate-700">
											Videos
										</p>
										{youTubeVideos.map((video, index) => (
											<TextField
												key={`youtube-video-${index}`}
												placeholder="https://www.youtube.com/watch?v=..."
												value={video}
												onChange={(event) =>
													handleYouTubeVideoChange(
														index,
														event.target.value,
													)
												}
												size="small"
												fullWidth
											/>
										))}
									</Box>
								)}
								<button
									type="button"
									onClick={handleAddYouTubeElement}
									disabled={!canAddYouTube}
									className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
								>
									新增 YouTube 區塊
								</button>
							</Box>
						</Box>
					) : null}
					{activeWidget.id === "weather" ? (
						<Box className="rounded-lg border border-slate-200 bg-white p-4">
							<Box className="flex flex-col gap-4">
								<Box className="flex flex-col gap-3">
									<TextField
										label="City"
										placeholder="輸入城市"
										value={activeWeatherCity}
										onChange={(event) =>
											handleWeatherCityChange(event.target.value)
										}
										size="small"
										fullWidth
									/>
									<TextField
										label="Country"
										placeholder="輸入國家"
										value={activeWeatherCountry}
										onChange={(event) =>
											handleWeatherCountryChange(event.target.value)
										}
										size="small"
										fullWidth
									/>
								</Box>
								<FormControl fullWidth size="small">
									<InputLabel id="weather-main-area-style-label">
										Main Area Style
									</InputLabel>
									<Select
										labelId="weather-main-area-style-label"
										label="Main Area Style"
										value={activeWeatherMainAreaStyle}
										onChange={(event) =>
											handleWeatherMainAreaStyleChange(
												String(event.target.value),
											)
										}
									>
										<MenuItem value="square">Square</MenuItem>
										<MenuItem value="rectangle-horizontal">
											Rectangle (Horizontal)
										</MenuItem>
									</Select>
								</FormControl>
								<Box className="flex flex-col gap-3">
									<p className="text-sm font-semibold text-slate-700">Style</p>
									<Box className="flex items-center gap-3">
										<label className="text-xs font-medium text-slate-600">
											Text Color
										</label>
										<input
											type="color"
											className="h-10 w-10 cursor-pointer rounded border border-slate-200"
											value={activeWeatherTextColor}
											onChange={(event) =>
												handleWeatherTextColorChange(event.target.value)
											}
											aria-label="Text color"
										/>
										<input
											type="text"
											className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
											value={activeWeatherTextColor.toUpperCase()}
											onChange={(event) =>
												handleWeatherTextColorChange(event.target.value)
											}
										/>
									</Box>
									<Box className="flex items-center gap-3">
										<label className="text-xs font-medium text-slate-600">
											Background Color
										</label>
										<input
											type="color"
											className="h-10 w-10 cursor-pointer rounded border border-slate-200"
											value={activeWeatherBackgroundColor}
											onChange={(event) =>
												handleWeatherBackgroundColorChange(
													event.target.value,
												)
											}
											aria-label="Background color"
										/>
										<input
											type="text"
											className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs text-slate-700"
											value={activeWeatherBackgroundColor.toUpperCase()}
											onChange={(event) =>
												handleWeatherBackgroundColorChange(
													event.target.value,
												)
											}
										/>
									</Box>
								</Box>
								<button
									type="button"
									onClick={handleAddWeatherElement}
									className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
								>
									新增天氣區塊
								</button>
							</Box>
						</Box>
					) : null}
					{activeWidget.id === "clock" ? (
						<Box className="rounded-lg border border-slate-200 bg-white p-4">
							<Box className="flex flex-col gap-4">
								<button
									type="button"
									onClick={() =>
										addClockElement({
											type: clockType,
											theme: clockTheme,
											displayFormat: clockDisplayFormat,
											timeFormat: clockTimeFormat,
											fontSize: clockFontSize,
											textColor: clockTextColor,
											backgroundColor: clockBackgroundColor,
										})
									}
									className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
								>
									新增時鐘
								</button>
								<FormControl fullWidth size="small">
									<InputLabel id="clock-type-label">
										Clock type
									</InputLabel>
									<Select
										labelId="clock-type-label"
										label="Clock type"
										value={activeClockType}
										onChange={(event) => {
											const nextType =
												event.target.value === "analog" ? "analog" : "digital";
											if (selectedClockId) {
												updateClockElement(selectedClockId, { type: nextType });
												return;
											}
											setClockType(nextType);
										}}
									>
										<MenuItem value="digital">Digital clock</MenuItem>
										<MenuItem value="analog">Analog clock</MenuItem>
									</Select>
								</FormControl>
								{activeClockType === "digital" ? (
									<>
										<FormControl fullWidth size="small">
											<InputLabel id="clock-display-format-label">
												Display format
											</InputLabel>
											<Select
												labelId="clock-display-format-label"
												label="Display format"
												value={activeClockDisplayFormat}
												onChange={(event) => {
													const nextValue = event.target
														.value as typeof clockDisplayFormat;
													if (selectedClock) {
														updateWidget(selectedClock.id, {
															displayFormat: nextValue,
														});
														return;
													}
													setClockDisplayFormat(nextValue);
												}}
											>
												{CLOCK_DISPLAY_OPTIONS.map((option) => (
													<MenuItem key={option.value} value={option.value}>
														{option.label}
													</MenuItem>
												))}
											</Select>
										</FormControl>
										<FormControl fullWidth size="small">
											<InputLabel id="clock-time-format-label">
												Time format
											</InputLabel>
											<Select
												labelId="clock-time-format-label"
												label="Time format"
												value={activeClockTimeFormat}
												onChange={(event) => {
													const nextValue = event.target
														.value as typeof clockTimeFormat;
													if (selectedClock) {
														updateWidget(selectedClock.id, {
															timeFormat: nextValue,
														});
														return;
													}
													setClockTimeFormat(nextValue);
												}}
											>
												{CLOCK_TIME_OPTIONS.map((option) => (
													<MenuItem key={option.value} value={option.value}>
														{option.label}
													</MenuItem>
												))}
											</Select>
										</FormControl>
										<div className="grid grid-cols-2 gap-3">
										<TextField
											label="Size"
											type="number"
											size="small"
											value={activeClockFontSize}
											inputProps={{ min: 1, max: 1024 }}
											onChange={(event) => {
												const nextValue = event.target.valueAsNumber;
												if (Number.isNaN(nextValue)) return;
												const nextFontSize = clampTextSize(nextValue);
												if (selectedClock) {
													updateWidget(selectedClock.id, {
														fontSize: nextFontSize,
													});
													return;
												}
												setClockFontSize(nextFontSize);
												setIsClockFontAuto(false);
											}}
										/>
											<p className="text-xs text-slate-500">
												新增後可在畫布拖曳縮放。
											</p>
										</div>
										<div className="space-y-2">
											<p className="text-sm font-semibold text-slate-700">
												Text color
											</p>
											<div className="flex flex-wrap items-center gap-2">
												{CLOCK_COLOR_OPTIONS.map((color) => (
													<button
														key={`text-${color}`}
														type="button"
														className={`h-7 w-7 rounded border border-slate-200 shadow-sm ${
															activeClockTextColor === color
																? "ring-2 ring-amber-500 ring-offset-1"
																: ""
														}`}
														style={{ backgroundColor: color }}
														onClick={() => {
															if (selectedClock) {
																updateWidget(selectedClock.id, {
																	textColor: color,
																});
																return;
															}
															setClockTextColor(color);
														}}
														aria-label={`Text color ${color}`}
													/>
												))}
												<input
													type="color"
													value={activeClockTextColor}
													onChange={(event) => {
														if (selectedClock) {
															updateWidget(selectedClock.id, {
																textColor: event.target.value,
															});
															return;
														}
														setClockTextColor(event.target.value);
													}}
													className="h-7 w-7 cursor-pointer rounded border border-slate-200"
													aria-label="Custom text color"
												/>
											</div>
										</div>
										<div className="space-y-2">
											<p className="text-sm font-semibold text-slate-700">
												Background color
											</p>
											<div className="flex flex-wrap items-center gap-2">
												<button
													type="button"
													className={`h-7 w-7 rounded border border-slate-200 shadow-sm ${
														activeClockBackgroundColor === "transparent"
															? "ring-2 ring-amber-500 ring-offset-1"
															: ""
													}`}
													style={{
														backgroundImage:
															"linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)",
														backgroundSize: "8px 8px",
														backgroundPosition:
															"0 0, 0 4px, 4px -4px, -4px 0px",
													}}
													onClick={() => {
														if (selectedClock) {
															updateWidget(selectedClock.id, {
																backgroundColor: "transparent",
															});
															return;
														}
														setClockBackgroundColor("transparent");
													}}
													aria-label="Background transparent"
												/>
												{CLOCK_COLOR_OPTIONS.map((color) => (
													<button
														key={`bg-${color}`}
														type="button"
														className={`h-7 w-7 rounded border border-slate-200 shadow-sm ${
															activeClockBackgroundColor === color
																? "ring-2 ring-amber-500 ring-offset-1"
																: ""
														}`}
														style={{ backgroundColor: color }}
														onClick={() => {
															if (selectedClock) {
																updateWidget(selectedClock.id, {
																	backgroundColor: color,
																});
																return;
															}
															setClockBackgroundColor(color);
														}}
														aria-label={`Background color ${color}`}
													/>
												))}
												<input
													type="color"
													value={
														activeClockBackgroundColor === "transparent"
															? "#ffffff"
															: activeClockBackgroundColor
													}
													onChange={(event) => {
														if (selectedClock) {
															updateWidget(selectedClock.id, {
																backgroundColor: event.target.value,
															});
															return;
														}
														setClockBackgroundColor(event.target.value);
													}}
													className="h-7 w-7 cursor-pointer rounded border border-slate-200"
													aria-label="Custom background color"
												/>
											</div>
										</div>
										<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
											<p className="text-sm font-semibold text-slate-700">
												Digital preview (固定字體大小)
											</p>
											<div
												className="mt-3 flex min-h-[64px] items-center justify-center rounded-md border border-slate-200 px-4 py-3 shadow-sm"
												style={{
													backgroundColor: activeClockBackgroundColor,
													color: activeClockTextColor,
												}}
											>
												<div
													className="flex flex-col items-center text-center font-mono font-semibold tracking-[0.15em]"
													style={{
														fontSize: `${CLOCK_PREVIEW_FONT_SIZE}px`,
													}}
												>
													{clockDisplayLines.map((line) => (
														<span key={line} className="leading-tight">
															{line}
														</span>
													))}
												</div>
											</div>
										</div>
									</>
								) : (
									<>
										<FormControl fullWidth size="small">
											<InputLabel id="clock-theme-label">
												Clock theme
											</InputLabel>
											<Select
												labelId="clock-theme-label"
												label="Clock theme"
												value={activeClockTheme}
												onChange={(event) => {
													const nextTheme =
														event.target.value === "dark" ? "dark" : "light";
													if (selectedClockId) {
														updateClockElement(selectedClockId, {
															theme: nextTheme,
														});
														return;
													}
													setClockTheme(nextTheme);
												}}
											>
												<MenuItem value="light">Light</MenuItem>
												<MenuItem value="dark">Dark</MenuItem>
											</Select>
										</FormControl>
										<p className="text-xs text-slate-500">
											新增後可在畫布拖曳縮放，指針會自動更新。
										</p>
										<div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
											<p className="text-sm font-semibold text-slate-700">
												Analog preview
											</p>
											<div className="mt-3 flex items-center justify-center">
												<div
													className="relative"
													style={{
														width: ANALOG_PREVIEW_SIZE,
														height: ANALOG_PREVIEW_SIZE,
													}}
												>
													<img
														src={ANALOG_PREVIEW_ASSETS[activeClockTheme].circle}
														alt={`${activeClockTheme} analog circle`}
														className="absolute inset-0 h-full w-full"
													/>
													<img
														src={ANALOG_PREVIEW_ASSETS[activeClockTheme].dial}
														alt={`${activeClockTheme} analog dial`}
														className="absolute inset-0 h-full w-full"
													/>
													<img
														src={ANALOG_PREVIEW_ASSETS[activeClockTheme].hour}
														alt={`${activeClockTheme} analog hour hand`}
														className="absolute left-1/2 top-1/2"
														style={{
															height: ANALOG_PREVIEW_HAND_SIZE,
															width: "auto",
															transform: `translate(-50%, -50%) rotate(${ANALOG_PREVIEW_ANGLES.hour}deg)`,
															transformOrigin: "center",
														}}
													/>
													<img
														src={ANALOG_PREVIEW_ASSETS[activeClockTheme].minute}
														alt={`${activeClockTheme} analog minute hand`}
														className="absolute left-1/2 top-1/2"
														style={{
															height: ANALOG_PREVIEW_HAND_SIZE,
															width: "auto",
															transform: `translate(-50%, -50%) rotate(${ANALOG_PREVIEW_ANGLES.minute}deg)`,
															transformOrigin: "center",
														}}
													/>
													<img
														src={ANALOG_PREVIEW_ASSETS[activeClockTheme].second}
														alt={`${activeClockTheme} analog second hand`}
														className="absolute left-1/2 top-1/2"
														style={{
															height: ANALOG_PREVIEW_HAND_SIZE,
															width: "auto",
															transform: `translate(-50%, -50%) rotate(${ANALOG_PREVIEW_ANGLES.second}deg)`,
															transformOrigin: "center",
														}}
													/>
												</div>
											</div>
										</div>
									</>
								)}
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
									<div className="grid grid-cols-4 gap-2">
										{SHAPE_OPTIONS.map((option) => (
											<button
												key={option.id}
												type="button"
												onClick={() => addShapeElement(option.id)}
												className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
												aria-label={option.label}
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
				</div>
			) : null}
		</aside>
	);
};

export default Widgets;
