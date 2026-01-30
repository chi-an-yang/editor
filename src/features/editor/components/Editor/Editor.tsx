import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	Image as KonvaImage,
	Layer,
	Label,
	Line,
	Group,
	Ellipse,
	Rect,
	Stage,
	Tag,
	Text as KonvaText,
	Transformer,
} from "react-konva";
import type Konva from "konva";
import QRCodeStyling from "qr-code-styling";
import Footer from "@features/editor/components/Footer";
import type {
	ClockElement,
	MediaElement,
	QrCodeElement,
	ShapeElement,
	TextElement,
	WeatherElement,
	YouTubeElement,
	WebPageElement,
} from "@features/editor/context/EditorContext";
import { DOC_DIMENSIONS, useEditorContext } from "@features/editor/context/EditorContext";

const PADDING = 64;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const MIN_TEXT_WIDTH = 120;
const MIN_TEXT_SIZE = 1;
const MAX_TEXT_SIZE = 1024;
const MIN_QR_SIZE = 120;
const WEATHER_ASPECT_RATIO = 16 / 9;
const MIN_WEATHER_HEIGHT = 720;
const MIN_WEATHER_WIDTH = Math.round(MIN_WEATHER_HEIGHT * WEATHER_ASPECT_RATIO);
const MIN_CLOCK_WIDTH = 200;
const MIN_CLOCK_HEIGHT = 80;
const MIN_CLOCK_FONT_SIZE = 1;
const MAX_CLOCK_FONT_SIZE = 1024;
const MIN_SHAPE_SIZE = 40;
const MIN_MEDIA_WIDTH = 160;
const MIN_MEDIA_HEIGHT = 120;
const GUIDE_THRESHOLD = 8;
const SNAP_PX = 8;
const TRANSFORMER_ANCHORS = [
	"top-left",
	"top-center",
	"top-right",
	"middle-left",
	"middle-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];
const CORNER_ANCHORS = new Set([
	"top-left",
	"top-right",
	"bottom-left",
	"bottom-right",
]);
const ANALOG_CLOCK_ASSETS = {
	light: {
		circle: "/assets/images/clock/clock-circle_white.png",
		dial: "/assets/images/clock/clock-dial_white.png",
		hour: "/assets/images/clock/clock_hour_white.png",
		minute: "/assets/images/clock/clock_minute_white.png",
		second: "/assets/images/clock/clock_second_white.png",
	},
	dark: {
		circle: "/assets/images/clock/clock-circle_black.png",
		dial: "/assets/images/clock/clock-dial_black.png",
		hour: "/assets/images/clock/clock_hour_black.png",
		minute: "/assets/images/clock/clock_minute_black.png",
		second: "/assets/images/clock/clock_second_black.png",
	},
};
const WEATHER_ICON_ASSETS = {
	current: "/assets/images/weather/w2.png",
	forecast: [
		"/assets/images/weather/w3.png",
		"/assets/images/weather/w4.png",
		"/assets/images/weather/w9.png",
		"/assets/images/weather/w10.png",
		"/assets/images/weather/w11.png",
	],
};

const buildClockTime = (date: Date, format: ClockElement["timeFormat"]) => {
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

const buildClockLines = (date: Date, element: ClockElement) => {
	const timeText = buildClockTime(date, element.timeFormat);
	const dateText = buildClockDate(date);

	switch (element.displayFormat) {
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

const getAnalogClockAngles = (date: Date) => {
	const hours = date.getHours() % 12;
	const minutes = date.getMinutes();
	const seconds = date.getSeconds();
	return {
		hour: (hours + minutes / 60 + seconds / 3600) * 30,
		minute: (minutes + seconds / 60) * 6,
		second: seconds * 6,
	};
};

const buildYouTubeLabel = (element: YouTubeElement) => {
	if (element.source === "playlist") {
		return `Playlist\n${element.playlistUrl || "未設定"}`;
	}
	const count = element.videos.filter((video) => video.trim()).length;
	return `Videos\n${count ? `${count} item${count === 1 ? "" : "s"}` : "未設定"}`;
};

type DragBoundFunc = (this: Konva.Node, pos: Konva.Vector2d) => Konva.Vector2d;

type QrCodeNodeProps = {
	element: QrCodeElement;
	isLocked: boolean;
	onSelect: () => void;
	onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void;
	onDragEnd: (position: { x: number; y: number }) => void;
	onTransformEnd: (node: Konva.Image) => void;
	nodeRef: (node: Konva.Image | null) => void;
	dragBoundFunc: DragBoundFunc;
};

type MediaImageNodeProps = {
	element: MediaElement;
	isLocked: boolean;
	onSelect: () => void;
	onDragMove: (event: Konva.KonvaEventObject<DragEvent>) => void;
	onDragEnd: (position: { x: number; y: number }) => void;
	onTransformEnd: (node: Konva.Image) => void;
	nodeRef: (node: Konva.Image | null) => void;
	dragBoundFunc: DragBoundFunc;
};

type ClipboardItem =
	| { type: "text"; data: Omit<TextElement, "id"> }
	| { type: "webPage"; data: Omit<WebPageElement, "id"> }
	| { type: "youtube"; data: Omit<YouTubeElement, "id"> }
	| { type: "qrCode"; data: Omit<QrCodeElement, "id"> }
	| { type: "weather"; data: Omit<WeatherElement, "id"> }
	| { type: "clock"; data: Omit<ClockElement, "id"> }
	| { type: "shape"; data: Omit<ShapeElement, "id"> }
	| { type: "media"; data: Omit<MediaElement, "id"> };

type SelectionBounds = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type SelectedItem =
	| { type: "text"; id: string }
	| { type: "webPage"; id: string }
	| { type: "youtube"; id: string }
	| { type: "qrCode"; id: string }
	| { type: "weather"; id: string }
	| { type: "clock"; id: string }
	| { type: "shape"; id: string }
	| { type: "media"; id: string };

type SelectedElement =
	| { type: "text"; element: TextElement }
	| { type: "webPage"; element: WebPageElement }
	| { type: "youtube"; element: YouTubeElement }
	| { type: "qrCode"; element: QrCodeElement }
	| { type: "weather"; element: WeatherElement }
	| { type: "clock"; element: ClockElement }
	| { type: "shape"; element: ShapeElement }
	| { type: "media"; element: MediaElement };

type GuideLine = {
	orientation: "vertical" | "horizontal";
	points: number[];
};

type AlignmentRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type BoundsRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

const getSnapDeltaToBounds = (
	nextRect: BoundsRect,
	bounds: BoundsRect,
	stageScale: { x: number; y: number },
) => {
	const scaleX = stageScale.x || 1;
	const scaleY = stageScale.y || 1;
	const thresholdX = SNAP_PX / scaleX;
	const thresholdY = SNAP_PX / scaleY;

	const xCandidates = [
		{ diff: bounds.x - nextRect.x, guide: bounds.x },
		{
			diff: bounds.x + bounds.width - (nextRect.x + nextRect.width),
			guide: bounds.x + bounds.width,
		},
	];
	const yCandidates = [
		{ diff: bounds.y - nextRect.y, guide: bounds.y },
		{
			diff: bounds.y + bounds.height - (nextRect.y + nextRect.height),
			guide: bounds.y + bounds.height,
		},
	];

	const bestX = xCandidates.reduce<{ diff: number; guide: number } | null>(
		(best, candidate) => {
			if (Math.abs(candidate.diff) > thresholdX) return best;
			if (!best || Math.abs(candidate.diff) < Math.abs(best.diff)) {
				return candidate;
			}
			return best;
		},
		null,
	);
	const bestY = yCandidates.reduce<{ diff: number; guide: number } | null>(
		(best, candidate) => {
			if (Math.abs(candidate.diff) > thresholdY) return best;
			if (!best || Math.abs(candidate.diff) < Math.abs(best.diff)) {
				return candidate;
			}
			return best;
		},
		null,
	);

	return {
		delta: {
			x: bestX?.diff ?? 0,
			y: bestY?.diff ?? 0,
		},
		guideTargets: {
			x: bestX?.guide,
			y: bestY?.guide,
		},
	};
};

const useClockImage = (src: string) => {
	const [image, setImage] = useState<HTMLImageElement | null>(null);

	useEffect(() => {
		let isMounted = true;
		const img = new window.Image();
		img.onload = () => {
			if (!isMounted) return;
			setImage(img);
		};
		img.src = src;

		return () => {
			isMounted = false;
		};
	}, [src]);

	return image;
};

type ClampBoxOptions = {
	layerScale: number;
	minWDoc: number;
	minHDoc: number;
	maxWDoc: number;
	maxHDoc: number;
	aspectRatio?: number;
};

const clampBox = (
	oldBox: Konva.RectConfig,
	newBox: Konva.RectConfig,
	options: ClampBoxOptions,
) => {
	const {
		layerScale,
		minWDoc,
		minHDoc,
		maxWDoc,
		maxHDoc,
		aspectRatio,
	} = options;
	const scale = layerScale || 1;
	const clampValue = (value: number, min: number, max: number) =>
		Math.min(Math.max(value, min), max);
	const widthDelta = Math.abs((newBox.width ?? 0) - (oldBox.width ?? 0));
	const heightDelta = Math.abs((newBox.height ?? 0) - (oldBox.height ?? 0));
	let widthDoc = clampValue(
		(newBox.width ?? oldBox.width ?? minWDoc) / scale,
		minWDoc,
		maxWDoc,
	);
	let heightDoc = clampValue(
		(newBox.height ?? oldBox.height ?? minHDoc) / scale,
		minHDoc,
		maxHDoc,
	);

	if (aspectRatio) {
		if (widthDelta >= heightDelta) {
			heightDoc = widthDoc / aspectRatio;
			if (heightDoc < minHDoc) {
				heightDoc = minHDoc;
				widthDoc = heightDoc * aspectRatio;
			} else if (heightDoc > maxHDoc) {
				heightDoc = maxHDoc;
				widthDoc = heightDoc * aspectRatio;
			}
		} else {
			widthDoc = heightDoc * aspectRatio;
			if (widthDoc < minWDoc) {
				widthDoc = minWDoc;
				heightDoc = widthDoc / aspectRatio;
			} else if (widthDoc > maxWDoc) {
				widthDoc = maxWDoc;
				heightDoc = widthDoc / aspectRatio;
			}
		}
	}

	return {
		...newBox,
		width: widthDoc * scale,
		height: heightDoc * scale,
	};
};

const makePageEdgeDragBoundFunc = (
	node: Konva.Node,
	pageNode: Konva.Node | null,
): DragBoundFunc => {
	return function handlePageEdgeDragBoundFunc(pos) {
		const stage = node.getStage();
		if (!stage || !pageNode) return pos;
		const currentAbsolute = node.absolutePosition();
		const rect = node.getClientRect({
			relativeTo: stage,
			skipStroke: true,
			skipShadow: true,
		});
		const bounds = pageNode.getClientRect({
			relativeTo: stage,
			skipStroke: true,
			skipShadow: true,
		});
		const deltaX = pos.x - currentAbsolute.x;
		const deltaY = pos.y - currentAbsolute.y;
		const nextRect = {
			x: rect.x + deltaX,
			y: rect.y + deltaY,
			width: rect.width,
			height: rect.height,
		};
		const { delta } = getSnapDeltaToBounds(nextRect, bounds, {
			x: stage.scaleX(),
			y: stage.scaleY(),
		});
		return {
			x: pos.x + delta.x,
			y: pos.y + delta.y,
		};
	};
};

const snapNodeToPageEdgesOnTransformEnd = (
	node: Konva.Node,
	pageNode: Konva.Node | null,
) => {
	const stage = node.getStage();
	if (!stage || !pageNode) return;
	const rect = node.getClientRect({
		relativeTo: stage,
		skipStroke: true,
		skipShadow: true,
	});
	const bounds = pageNode.getClientRect({
		relativeTo: stage,
		skipStroke: true,
		skipShadow: true,
	});
	const { delta } = getSnapDeltaToBounds(rect, bounds, {
		x: stage.scaleX(),
		y: stage.scaleY(),
	});
	if (delta.x === 0 && delta.y === 0) return;
	const absolutePosition = node.absolutePosition();
	node.absolutePosition({
		x: absolutePosition.x + delta.x,
		y: absolutePosition.y + delta.y,
	});
};

const MediaImageNode = ({
	element,
	isLocked,
	onSelect,
	onDragMove,
	onDragEnd,
	onTransformEnd,
	nodeRef,
	dragBoundFunc,
}: MediaImageNodeProps) => {
	const [image, setImage] = useState<HTMLImageElement | null>(null);

	useEffect(() => {
		let isMounted = true;
		if (!element.src) {
			setImage(null);
			return;
		}

		const img = new window.Image();
		img.onload = () => {
			if (!isMounted) return;
			setImage(img);
		};
		img.src = element.src;

		return () => {
			isMounted = false;
		};
	}, [element.src]);

	return (
		<KonvaImage
			ref={nodeRef}
			image={image ?? undefined}
			x={element.x}
			y={element.y}
			width={element.width}
			height={element.height}
			draggable={!isLocked}
			onClick={onSelect}
			onTap={onSelect}
			onDragMove={onDragMove}
			dragBoundFunc={dragBoundFunc}
			onDragEnd={(event) =>
				onDragEnd({ x: event.target.x(), y: event.target.y() })
			}
			onTransformEnd={(event) => {
				onTransformEnd(event.target as Konva.Image);
			}}
		/>
	);
};

const QrCodeNode = ({
	element,
	isLocked,
	onSelect,
	onDragMove,
	onDragEnd,
	onTransformEnd,
	nodeRef,
	dragBoundFunc,
}: QrCodeNodeProps) => {
	const [image, setImage] = useState<HTMLImageElement | null>(null);

	useEffect(() => {
		let isMounted = true;
		if (!element.text.trim()) {
			setImage(null);
			return;
		}

		const qrCode = new QRCodeStyling({
			width: element.size,
			height: element.size,
			data: element.text,
			margin: 0,
			dotsOptions: {
				color: "#0f172a",
				type: "square",
			},
			backgroundOptions: {
				color: "transparent",
			},
		});

		qrCode
			.getRawData("png")
			.then((blob) => {
				if (!blob || !isMounted) return;
				const url = URL.createObjectURL(blob);
				const img = new window.Image();
				img.onload = () => {
					if (!isMounted) return;
					setImage(img);
					URL.revokeObjectURL(url);
				};
				img.src = url;
			})
			.catch(() => {
				if (isMounted) {
					setImage(null);
				}
			});

		return () => {
			isMounted = false;
		};
	}, [element.size, element.text]);

	return (
		<KonvaImage
			ref={nodeRef}
			image={image ?? undefined}
			x={element.x}
			y={element.y}
			width={element.size}
			height={element.size}
			draggable={!isLocked}
			onClick={onSelect}
			onTap={onSelect}
			onDragMove={onDragMove}
			dragBoundFunc={dragBoundFunc}
			onDragEnd={(event) =>
				onDragEnd({ x: event.target.x(), y: event.target.y() })
			}
			onTransformEnd={(event) => {
				onTransformEnd(event.target as Konva.Image);
			}}
		/>
	);
};

function clamp(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}

const computeLayout = (vw: number, vh: number, s: number) => {
	const stageW = Math.max(vw, DOC_DIMENSIONS.width * s + PADDING * 2);
	const stageH = Math.max(vh, DOC_DIMENSIONS.height * s + PADDING * 2);

	const nextPos = {
		x: (stageW - DOC_DIMENSIONS.width * s) / 2,
		y: (stageH - DOC_DIMENSIONS.height * s) / 2,
	};

	return { stageW, stageH, pos: nextPos };
};

const clampTextSize = (size: number) =>
	clamp(Math.round(size), MIN_TEXT_SIZE, MAX_TEXT_SIZE);

const normalizePoints = (
	points: Array<[number, number]>,
	width: number,
	height: number,
) => points.flatMap(([x, y]) => [x * width, y * height]);

const SHAPE_POINTS = {
	triangle: [
		[0.5, 0],
		[1, 1],
		[0, 1],
	],
	"triangle-inverted": [
		[0, 0],
		[1, 0],
		[0.5, 1],
	],
	diamond: [
		[0.5, 0],
		[1, 0.5],
		[0.5, 1],
		[0, 0.5],
	],
	plus: [
		[0.35, 0],
		[0.65, 0],
		[0.65, 0.35],
		[1, 0.35],
		[1, 0.65],
		[0.65, 0.65],
		[0.65, 1],
		[0.35, 1],
		[0.35, 0.65],
		[0, 0.65],
		[0, 0.35],
		[0.35, 0.35],
	],
	pentagon: [
		[0.5, 0],
		[1, 0.38],
		[0.82, 1],
		[0.18, 1],
		[0, 0.38],
	],
	hexagon: [
		[0.25, 0],
		[0.75, 0],
		[1, 0.5],
		[0.75, 1],
		[0.25, 1],
		[0, 0.5],
	],
	trapezoid: [
		[0.2, 0],
		[0.8, 0],
		[1, 1],
		[0, 1],
	],
	parallelogram: [
		[0.2, 0],
		[1, 0],
		[0.8, 1],
		[0, 1],
	],
	"right-triangle": [
		[0, 0],
		[1, 1],
		[0, 1],
	],
} as const;

export default function Editor() {
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const stageRef = useRef<Konva.Stage | null>(null);
	const pageLayerRef = useRef<Konva.Layer | null>(null);
	const pageRef = useRef<Konva.Rect | null>(null);
	const transformerRef = useRef<Konva.Transformer | null>(null);
	const webPageTransformerRef = useRef<Konva.Transformer | null>(null);
	const youTubeTransformerRef = useRef<Konva.Transformer | null>(null);
	const qrCodeTransformerRef = useRef<Konva.Transformer | null>(null);
	const weatherTransformerRef = useRef<Konva.Transformer | null>(null);
	const clockTransformerRef = useRef<Konva.Transformer | null>(null);
	const shapeTransformerRef = useRef<Konva.Transformer | null>(null);
	const mediaTransformerRef = useRef<Konva.Transformer | null>(null);
	const mainRef = useRef<HTMLElement | null>(null);
	const textLabelRefs = useRef<Record<string, Konva.Label | null>>({});
	const textNodeRefs = useRef<Record<string, Konva.Text | null>>({});
	const webPageNodeRefs = useRef<Record<string, Konva.Rect | null>>({});
	const youTubeNodeRefs = useRef<Record<string, Konva.Rect | null>>({});
	const qrCodeNodeRefs = useRef<Record<string, Konva.Image | null>>({});
	const weatherNodeRefs = useRef<Record<string, Konva.Group | null>>({});
	const clockNodeRefs = useRef<Record<string, Konva.Group | null>>({});
	const shapeNodeRefs = useRef<Record<string, Konva.Shape | null>>({});
	const mediaNodeRefs = useRef<Record<string, Konva.Node | null>>({});
	const handleTransformerTransformStart = useCallback(
		(event: Konva.KonvaEventObject<Event>) => {
			const transformer = event.target as Konva.Transformer;
			const activeAnchor = transformer.getActiveAnchor();
			transformer.keepRatio(CORNER_ANCHORS.has(activeAnchor ?? ""));
		},
		[],
	);
	const {
		textElements,
		selectedTextId,
		webPageElements,
		selectedWebPageId,
		youTubeElements,
		selectedYouTubeId,
		qrCodeElements,
		selectedQrCodeId,
		weatherElements,
		selectedWeatherId,
		clockElements,
		selectedClockId,
		shapeElements,
		selectedShapeId,
		mediaElements,
		selectedMediaId,
		setSelectedWidgetId,
		createTextElement,
		createWebPageElement,
		createYouTubeElement,
		createQrCodeElement,
		createWeatherElement,
		createClockElement,
		createShapeElement,
		createMediaElement,
		updateTextElement,
		updateWebPageElement,
		updateYouTubeElement,
		updateQrCodeElement,
		updateWeatherElement,
		updateClockElement,
		updateShapeElement,
		updateMediaElement,
		removeTextElement,
		removeWebPageElement,
		removeYouTubeElement,
		removeQrCodeElement,
		removeWeatherElement,
		removeClockElement,
		removeShapeElement,
		removeMediaElement,
	} = useEditorContext();

	const analogClockImages = {
		light: {
			circle: useClockImage(ANALOG_CLOCK_ASSETS.light.circle),
			dial: useClockImage(ANALOG_CLOCK_ASSETS.light.dial),
			hour: useClockImage(ANALOG_CLOCK_ASSETS.light.hour),
			minute: useClockImage(ANALOG_CLOCK_ASSETS.light.minute),
			second: useClockImage(ANALOG_CLOCK_ASSETS.light.second),
		},
		dark: {
			circle: useClockImage(ANALOG_CLOCK_ASSETS.dark.circle),
			dial: useClockImage(ANALOG_CLOCK_ASSETS.dark.dial),
			hour: useClockImage(ANALOG_CLOCK_ASSETS.dark.hour),
			minute: useClockImage(ANALOG_CLOCK_ASSETS.dark.minute),
			second: useClockImage(ANALOG_CLOCK_ASSETS.dark.second),
		},
	};
	const weatherIconImages = {
		current: useClockImage(WEATHER_ICON_ASSETS.current),
		forecast: [
			useClockImage(WEATHER_ICON_ASSETS.forecast[0]),
			useClockImage(WEATHER_ICON_ASSETS.forecast[1]),
			useClockImage(WEATHER_ICON_ASSETS.forecast[2]),
			useClockImage(WEATHER_ICON_ASSETS.forecast[3]),
			useClockImage(WEATHER_ICON_ASSETS.forecast[4]),
		],
	};

	const viewportSizeRef = useRef({ width: 1, height: 1 });
	// viewport = Editor 可視區大小（不等於 DOC）
	const [viewport, setViewport] = useState({ width: 1, height: 1 });

	// scale = 顯示比例（1 = 100% = 3840x2160）
	const [scale, setScale] = useState(0.2);

	// mode = 是否維持 Fit 模式（容器 resize 時會重算 fit）
	const [mode, setMode] = useState<"fit" | "custom">("fit");
	const [clockNow, setClockNow] = useState(() => new Date());
	const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
	const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
	const [selectionBounds, setSelectionBounds] = useState<SelectionBounds | null>(
		null,
	);
	const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
	const [toolbarPosition, setToolbarPosition] = useState({ left: 0, top: 0 });
	const toolbarRef = useRef<HTMLDivElement | null>(null);

	const calcFit = useCallback((vw: number, vh: number) => {
		const s = Math.min(
			(vw - PADDING * 2) / DOC_DIMENSIONS.width,
			(vh - PADDING * 2) / DOC_DIMENSIONS.height,
		);
		return clamp(s, MIN_SCALE, MAX_SCALE);
	}, []);

	const updateViewport = useCallback((vw: number, vh: number) => {
		const prev = viewportSizeRef.current;
		if (prev.width === vw && prev.height === vh) return false;
		viewportSizeRef.current = { width: vw, height: vh };
		setViewport((current) =>
			current.width === vw && current.height === vh
				? current
				: { width: vw, height: vh },
		);
		return true;
	}, []);

	const centerScroll = useCallback(
		(stageW: number, stageH: number, vw: number, vh: number) => {
			const c = viewportRef.current;
			if (!c) return;
			const left = Math.max(0, (stageW - vw) / 2);
			const top = Math.max(0, (stageH - vh) / 2);
			c.scrollLeft = left;
			c.scrollTop = top;
		},
		[],
	);

	const fitToScreen = useCallback(() => {
		const c = viewportRef.current;
		if (!c) return;

		const vw = Math.max(1, Math.floor(c.clientWidth));
		const vh = Math.max(1, Math.floor(c.clientHeight));
		updateViewport(vw, vh);

		const s = calcFit(vw, vh);
		setScale(s);
		setMode("fit");
		requestAnimationFrame(() => {
			const { stageW, stageH } = computeLayout(vw, vh, s);
			centerScroll(stageW, stageH, vw, vh);
		});
	}, [calcFit, centerScroll, updateViewport]);

	const setZoomTo = useCallback(
		(nextScale: number) => {
			const s = clamp(nextScale, MIN_SCALE, MAX_SCALE);
			const { width: vw, height: vh } = viewportSizeRef.current;
			setScale(s);
			setMode("custom");
			requestAnimationFrame(() => {
				const { stageW, stageH } = computeLayout(vw, vh, s);
				centerScroll(stageW, stageH, vw, vh);
			});
		},
		[centerScroll],
	);

	const updateToolbarPosition = useCallback(() => {
		const main = mainRef.current;
		if (!main) return;

		const header = document.querySelector("header");
		const headerHeight = header?.getBoundingClientRect().height ?? 0;
		const toolbarHeight =
			toolbarRef.current?.getBoundingClientRect().height ?? 0;

		if (!selectionBounds) {
			const rect = main.getBoundingClientRect();
			setToolbarPosition({
				left: rect.left + rect.width / 2,
				top: headerHeight + 12,
			});
			return;
		}

		const stageContainer = stageRef.current?.container();
		const containerRect = stageContainer?.getBoundingClientRect();
		if (!containerRect) return;

		const margin = 16;
		const nextLeft =
			containerRect.left + selectionBounds.x + selectionBounds.width / 2;
		const nextTop =
			containerRect.top + selectionBounds.y - toolbarHeight - margin;
		const minTop = headerHeight + 8;

		setToolbarPosition({
			left: nextLeft,
			top: Math.max(minTop, nextTop),
		});
	}, [selectionBounds]);

	// Resize：若還在 fit 模式就重算；否則只更新 viewport
	useEffect(() => {
		const c = viewportRef.current;
		if (!c) return;

		const update = (entries?: ResizeObserverEntry[]) => {
			const entry = entries?.[0];
			const rect = c.getBoundingClientRect();
			console.debug("[editor][resize]", {
				target: entry?.target instanceof HTMLElement ? entry.target.className : undefined,
				contentRect: entry?.contentRect
					? {
							width: Math.floor(entry.contentRect.width),
							height: Math.floor(entry.contentRect.height),
						}
					: undefined,
				client: { width: c.clientWidth, height: c.clientHeight },
				offset: { width: c.offsetWidth, height: c.offsetHeight },
				rect: { width: Math.floor(rect.width), height: Math.floor(rect.height) },
				window: { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
				document: {
					clientHeight: document.documentElement.clientHeight,
					scrollHeight: document.documentElement.scrollHeight,
					bodyScrollHeight: document.body.scrollHeight,
				},
			});
			const vw = Math.max(1, Math.floor(c.clientWidth));
			const vh = Math.max(1, Math.floor(c.clientHeight));
			const didChange = updateViewport(vw, vh);
			if (!didChange) return;

			updateToolbarPosition();

			if (mode === "fit") {
				const s = calcFit(vw, vh);
				setScale(s);
				requestAnimationFrame(() => {
					const { stageW, stageH } = computeLayout(vw, vh, s);
					centerScroll(stageW, stageH, vw, vh);
				});
				return;
			}
			requestAnimationFrame(() => {
				const { stageW, stageH } = computeLayout(vw, vh, scale);
				centerScroll(stageW, stageH, vw, vh);
			});
		};

		update();
		const ro = new ResizeObserver(update);
		ro.observe(c);
		return () => ro.disconnect();
	}, [calcFit, centerScroll, mode, scale, updateToolbarPosition, updateViewport]);

	useEffect(() => {
		updateToolbarPosition();
		window.addEventListener("scroll", updateToolbarPosition, { passive: true });
		return () => {
			window.removeEventListener("scroll", updateToolbarPosition);
		};
	}, [updateToolbarPosition]);

	useEffect(() => {
		if (!clockElements.length) return;
		setClockNow(new Date());
		const timer = window.setInterval(() => {
			setClockNow(new Date());
		}, 1000);
		return () => window.clearInterval(timer);
	}, [clockElements.length]);

	// Ctrl + 滾輪：縮放
	const handleWheel = useCallback(
		(e: Konva.KonvaEventObject<WheelEvent>) => {
			if (!e.evt.ctrlKey) return;
			e.evt.preventDefault();

			const factor = 1.02;
			const direction = e.evt.deltaY > 0 ? -1 : 1;
			const next = direction > 0 ? scale * factor : scale / factor;

			setZoomTo(next);
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

	const layout = useMemo(() => {
		const { width: vw, height: vh } = viewport;
		return computeLayout(vw, vh, scale);
	}, [scale, viewport.height, viewport.width]);

	const canvasSize = useMemo(
		() => ({ width: layout.stageW, height: layout.stageH }),
		[layout.stageH, layout.stageW],
	);

	const viewportOverflowStyle = useMemo(() => {
		const epsilon = 1;
		const overflowX = layout.stageW > viewport.width + epsilon ? "auto" : "hidden";
		const overflowY = layout.stageH > viewport.height + epsilon ? "auto" : "hidden";
		return { overflowX, overflowY } as const;
	}, [layout.stageH, layout.stageW, viewport.height, viewport.width]);

	const getSelectionFromContext = useCallback((): SelectedItem | null => {
		if (selectedTextId) return { type: "text", id: selectedTextId };
		if (selectedWebPageId) return { type: "webPage", id: selectedWebPageId };
		if (selectedYouTubeId) return { type: "youtube", id: selectedYouTubeId };
		if (selectedQrCodeId) return { type: "qrCode", id: selectedQrCodeId };
		if (selectedWeatherId) return { type: "weather", id: selectedWeatherId };
		if (selectedClockId) return { type: "clock", id: selectedClockId };
		if (selectedShapeId) return { type: "shape", id: selectedShapeId };
		if (selectedMediaId) return { type: "media", id: selectedMediaId };
		return null;
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

	const applyContextSelection = useCallback(
		(selection: SelectedItem | null) => {
			setSelectedWidgetId(selection?.id ?? null);
		},
		[setSelectedWidgetId],
	);

	const getItemsByGroupId = useCallback(
		(groupId: string) => {
			const items: SelectedItem[] = [];
			textElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "text", id: item.id });
				}
			});
			webPageElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "webPage", id: item.id });
				}
			});
			youTubeElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "youtube", id: item.id });
				}
			});
			qrCodeElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "qrCode", id: item.id });
				}
			});
			weatherElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "weather", id: item.id });
				}
			});
			clockElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "clock", id: item.id });
				}
			});
			shapeElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "shape", id: item.id });
				}
			});
			mediaElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "media", id: item.id });
				}
			});
			return items;
		},
		[
			clockElements,
			mediaElements,
			qrCodeElements,
			weatherElements,
			shapeElements,
			textElements,
			youTubeElements,
			webPageElements,
		],
	);

	const handleSelectItem = useCallback(
		(selection: SelectedItem, groupId: string | null) => {
			if (groupId) {
				const groupItems = getItemsByGroupId(groupId);
				setSelectedItems(groupItems.length ? groupItems : [selection]);
				applyContextSelection(groupItems[0] ?? selection);
				return;
			}
			setSelectedItems([selection]);
			applyContextSelection(selection);
		},
		[applyContextSelection, getItemsByGroupId],
	);

	const clearSelection = useCallback(() => {
		setSelectedItems([]);
		applyContextSelection(null);
	}, [applyContextSelection]);

	useEffect(() => {
		if (selectedItems.length > 1) return;
		const nextSelection = getSelectionFromContext();
		if (!nextSelection) {
			if (selectedItems.length) {
				setSelectedItems([]);
			}
			return;
		}
		if (
			!selectedItems.length ||
			selectedItems[0].id !== nextSelection.id ||
			selectedItems[0].type !== nextSelection.type
		) {
			setSelectedItems([nextSelection]);
		}
	}, [getSelectionFromContext, selectedItems]);

	const getAllItems = useCallback(() => {
		const items: SelectedItem[] = [];
		textElements.forEach((item) => items.push({ type: "text", id: item.id }));
		webPageElements.forEach((item) =>
			items.push({ type: "webPage", id: item.id }),
		);
		youTubeElements.forEach((item) =>
			items.push({ type: "youtube", id: item.id }),
		);
		qrCodeElements.forEach((item) =>
			items.push({ type: "qrCode", id: item.id }),
		);
		weatherElements.forEach((item) =>
			items.push({ type: "weather", id: item.id }),
		);
		clockElements.forEach((item) =>
			items.push({ type: "clock", id: item.id }),
		);
		shapeElements.forEach((item) =>
			items.push({ type: "shape", id: item.id }),
		);
		mediaElements.forEach((item) =>
			items.push({ type: "media", id: item.id }),
		);
		return items;
	}, [
		clockElements,
		mediaElements,
		qrCodeElements,
		weatherElements,
		shapeElements,
		textElements,
		youTubeElements,
		webPageElements,
	]);

	const handleSelectAll = useCallback(() => {
		const allItems = getAllItems();
		setSelectedItems(allItems);
		applyContextSelection(allItems[0] ?? null);
	}, [applyContextSelection, getAllItems]);

	const selectedText = useMemo(
		() => textElements.find((item) => item.id === selectedTextId) ?? null,
		[selectedTextId, textElements],
	);
	const selectedWebPage = useMemo(
		() => webPageElements.find((item) => item.id === selectedWebPageId) ?? null,
		[selectedWebPageId, webPageElements],
	);
	const selectedYouTube = useMemo(
		() => youTubeElements.find((item) => item.id === selectedYouTubeId) ?? null,
		[selectedYouTubeId, youTubeElements],
	);
	const selectedQrCode = useMemo(
		() => qrCodeElements.find((item) => item.id === selectedQrCodeId) ?? null,
		[selectedQrCodeId, qrCodeElements],
	);
	const selectedWeather = useMemo(
		() => weatherElements.find((item) => item.id === selectedWeatherId) ?? null,
		[selectedWeatherId, weatherElements],
	);
	const selectedClock = useMemo(
		() => clockElements.find((item) => item.id === selectedClockId) ?? null,
		[selectedClockId, clockElements],
	);
	const selectedShape = useMemo(
		() => shapeElements.find((item) => item.id === selectedShapeId) ?? null,
		[selectedShapeId, shapeElements],
	);
	const selectedMedia = useMemo(
		() => mediaElements.find((item) => item.id === selectedMediaId) ?? null,
		[selectedMediaId, mediaElements],
	);

	const getElementBySelection = useCallback(
		(selection: SelectedItem): SelectedElement | null => {
			switch (selection.type) {
				case "text": {
					const element =
						textElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "text", element } : null;
				}
				case "webPage": {
					const element =
						webPageElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "webPage", element } : null;
				}
				case "youtube": {
					const element =
						youTubeElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "youtube", element } : null;
				}
				case "qrCode": {
					const element =
						qrCodeElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "qrCode", element } : null;
				}
				case "weather": {
					const element =
						weatherElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "weather", element } : null;
				}
				case "clock": {
					const element =
						clockElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "clock", element } : null;
				}
				case "shape": {
					const element =
						shapeElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "shape", element } : null;
				}
				case "media": {
					const element =
						mediaElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "media", element } : null;
				}
			}
		},
		[
			clockElements,
			mediaElements,
			qrCodeElements,
			weatherElements,
			shapeElements,
			textElements,
			youTubeElements,
			webPageElements,
		],
	);

	const selectedElements = useMemo(
		() =>
			selectedItems
				.map((item) => getElementBySelection(item))
				.filter(Boolean) as SelectedElement[],
		[getElementBySelection, selectedItems],
	);

	const activeSelectedElement = selectedElements[0] ?? null;
	const selectionIsLocked =
		selectedElements.length > 0 &&
		selectedElements.every((item) => item.element.locked);

	useEffect(() => {
		const transformer = transformerRef.current;
		if (!transformer) return;
		if (!selectedTextId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = textLabelRefs.current[selectedTextId];
		if (node && selectedText && !selectedText.locked) {
			transformer.nodes([node]);
		} else {
			transformer.nodes([]);
		}
		transformer.getLayer()?.batchDraw();
	}, [selectedTextId, selectedText]);

	useEffect(() => {
		const transformer = webPageTransformerRef.current;
		if (!transformer) return;
		if (!selectedWebPageId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = webPageNodeRefs.current[selectedWebPageId];
		if (node && selectedWebPage && !selectedWebPage.locked) {
			transformer.nodes([node]);
		} else {
			transformer.nodes([]);
		}
		transformer.getLayer()?.batchDraw();
	}, [selectedWebPageId, selectedWebPage]);

	useEffect(() => {
		const transformer = youTubeTransformerRef.current;
		if (!transformer) return;
		if (!selectedYouTubeId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = youTubeNodeRefs.current[selectedYouTubeId];
		if (node && selectedYouTube && !selectedYouTube.locked) {
			transformer.nodes([node]);
		} else {
			transformer.nodes([]);
		}
		transformer.getLayer()?.batchDraw();
	}, [selectedYouTube, selectedYouTubeId]);

	useEffect(() => {
		const transformer = qrCodeTransformerRef.current;
		if (!transformer) return;
		if (!selectedQrCodeId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = qrCodeNodeRefs.current[selectedQrCodeId];
		if (node && selectedQrCode && !selectedQrCode.locked) {
			transformer.nodes([node]);
		} else {
			transformer.nodes([]);
		}
		transformer.getLayer()?.batchDraw();
	}, [selectedQrCodeId, selectedQrCode]);

	useEffect(() => {
		const transformer = weatherTransformerRef.current;
		if (!transformer) return;
		if (!selectedWeatherId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = weatherNodeRefs.current[selectedWeatherId];
		if (node && selectedWeather && !selectedWeather.locked) {
			transformer.nodes([node]);
		} else {
			transformer.nodes([]);
		}
		transformer.getLayer()?.batchDraw();
	}, [selectedWeatherId, selectedWeather]);

	useEffect(() => {
		const transformer = clockTransformerRef.current;
		if (!transformer) return;
		if (!selectedClockId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = clockNodeRefs.current[selectedClockId];
		if (node && selectedClock && !selectedClock.locked) {
			transformer.nodes([node]);
		} else {
			transformer.nodes([]);
		}
		transformer.getLayer()?.batchDraw();
	}, [selectedClock, selectedClockId]);

	useEffect(() => {
		const transformer = shapeTransformerRef.current;
		if (!transformer) return;
		if (!selectedShapeId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = shapeNodeRefs.current[selectedShapeId];
		if (node && selectedShape && !selectedShape.locked) {
			transformer.nodes([node]);
		} else {
			transformer.nodes([]);
		}
		transformer.getLayer()?.batchDraw();
	}, [selectedShapeId, selectedShape]);

	useEffect(() => {
		const transformer = mediaTransformerRef.current;
		if (!transformer) return;
		if (!selectedMediaId) {
			transformer.nodes([]);
			transformer.getLayer()?.batchDraw();
			return;
		}
		const node = mediaNodeRefs.current[selectedMediaId];
		if (node && selectedMedia && !selectedMedia.locked) {
			transformer.nodes([node]);
		} else {
			transformer.nodes([]);
		}
		transformer.getLayer()?.batchDraw();
	}, [selectedMediaId, selectedMedia]);

	const startEditingText = useCallback(
		(target: Konva.Text, elementId: string) => {
			const stage = stageRef.current;
			if (!stage) return;

			const container = stage.container();
			const textarea = document.createElement("textarea");
			const textPosition = target.getAbsolutePosition();
			const scale = target.getAbsoluteScale();
			const stageBox = container.getBoundingClientRect();
			const textElement = textElements.find((item) => item.id === elementId);
			const backgroundColor =
				textElement?.backgroundColor &&
				textElement.backgroundColor !== "transparent"
					? textElement.backgroundColor
					: "white";

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
			textarea.style.background = backgroundColor;
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
		[textElements, updateTextElement],
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

	const handleToggleLock = useCallback(() => {
		if (!selectedElements.length) return;
		const nextLocked = selectedElements.some((item) => !item.element.locked);
		selectedElements.forEach((item) => {
			switch (item.type) {
				case "text":
					updateTextElement(item.element.id, { locked: nextLocked });
					break;
				case "webPage":
					updateWebPageElement(item.element.id, { locked: nextLocked });
					break;
				case "youtube":
					updateYouTubeElement(item.element.id, { locked: nextLocked });
					break;
				case "qrCode":
					updateQrCodeElement(item.element.id, { locked: nextLocked });
					break;
				case "weather":
					updateWeatherElement(item.element.id, { locked: nextLocked });
					break;
				case "clock":
					updateClockElement(item.element.id, { locked: nextLocked });
					break;
				case "shape":
					updateShapeElement(item.element.id, { locked: nextLocked });
					break;
				case "media":
					updateMediaElement(item.element.id, { locked: nextLocked });
					break;
			}
		});
	}, [
		selectedElements,
		updateClockElement,
		updateMediaElement,
		updateQrCodeElement,
		updateWeatherElement,
		updateShapeElement,
		updateTextElement,
		updateYouTubeElement,
		updateWebPageElement,
	]);

	const pasteClipboard = useCallback(
		(nextClipboard: typeof clipboard, offset = 32) => {
			if (!nextClipboard) return;
			switch (nextClipboard.type) {
				case "text":
					createTextElement({
						...nextClipboard.data,
						x: nextClipboard.data.x + offset,
						y: nextClipboard.data.y + offset,
					});
					break;
				case "webPage":
					createWebPageElement({
						...nextClipboard.data,
						x: nextClipboard.data.x + offset,
						y: nextClipboard.data.y + offset,
					});
					break;
				case "youtube":
					createYouTubeElement({
						...nextClipboard.data,
						x: nextClipboard.data.x + offset,
						y: nextClipboard.data.y + offset,
					});
					break;
				case "qrCode":
					createQrCodeElement({
						...nextClipboard.data,
						x: nextClipboard.data.x + offset,
						y: nextClipboard.data.y + offset,
					});
					break;
				case "weather":
					createWeatherElement({
						...nextClipboard.data,
						x: nextClipboard.data.x + offset,
						y: nextClipboard.data.y + offset,
					});
					break;
				case "clock":
					createClockElement({
						...nextClipboard.data,
						x: nextClipboard.data.x + offset,
						y: nextClipboard.data.y + offset,
					});
					break;
				case "shape":
					createShapeElement({
						...nextClipboard.data,
						x: nextClipboard.data.x + offset,
						y: nextClipboard.data.y + offset,
					});
					break;
				case "media":
					createMediaElement({
						...nextClipboard.data,
						x: nextClipboard.data.x + offset,
						y: nextClipboard.data.y + offset,
					});
					break;
			}
		},
		[
			createClockElement,
			createMediaElement,
			createQrCodeElement,
			createWeatherElement,
			createShapeElement,
			createTextElement,
			createYouTubeElement,
			createWebPageElement,
		],
	);

	const handleCopy = useCallback(() => {
		if (!activeSelectedElement) return;
		switch (activeSelectedElement.type) {
			case "text": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "text", data: { ...data, groupId: null } } as const;
			}
			case "webPage": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "webPage", data: { ...data, groupId: null } } as const;
			}
			case "youtube": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "youtube", data: { ...data, groupId: null } } as const;
			}
			case "qrCode": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "qrCode", data: { ...data, groupId: null } } as const;
			}
			case "weather": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "weather", data: { ...data, groupId: null } } as const;
			}
			case "clock": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "clock", data: { ...data, groupId: null } } as const;
			}
			case "shape": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "shape", data: { ...data, groupId: null } } as const;
			}
			case "media": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "media", data: { ...data, groupId: null } } as const;
			}
		}
	}, [activeSelectedElement]);

	const handleDuplicate = useCallback(() => {
		if (!selectedElements.length) return;
		if (selectedElements.length === 1 && activeSelectedElement) {
			switch (activeSelectedElement.type) {
				case "text": {
					const { id, groupId, ...data } = activeSelectedElement.element;
					const nextClipboard = {
						type: "text",
						data: { ...data, groupId: null },
					} as const;
					setClipboard(nextClipboard);
					pasteClipboard(nextClipboard);
					break;
				}
				case "webPage": {
					const { id, groupId, ...data } = activeSelectedElement.element;
					const nextClipboard = {
						type: "webPage",
						data: { ...data, groupId: null },
					} as const;
					setClipboard(nextClipboard);
					pasteClipboard(nextClipboard);
					break;
				}
				case "youtube": {
					const { id, groupId, ...data } = activeSelectedElement.element;
					const nextClipboard = {
						type: "youtube",
						data: { ...data, groupId: null },
					} as const;
					setClipboard(nextClipboard);
					pasteClipboard(nextClipboard);
					break;
				}
				case "qrCode": {
					const { id, groupId, ...data } = activeSelectedElement.element;
					const nextClipboard = {
						type: "qrCode",
						data: { ...data, groupId: null },
					} as const;
					setClipboard(nextClipboard);
					pasteClipboard(nextClipboard);
					break;
				}
				case "weather": {
					const { id, groupId, ...data } = activeSelectedElement.element;
					const nextClipboard = {
						type: "weather",
						data: { ...data, groupId: null },
					} as const;
					setClipboard(nextClipboard);
					pasteClipboard(nextClipboard);
					break;
				}
				case "clock": {
					const { id, groupId, ...data } = activeSelectedElement.element;
					const nextClipboard = {
						type: "clock",
						data: { ...data, groupId: null },
					} as const;
					setClipboard(nextClipboard);
					pasteClipboard(nextClipboard);
					break;
				}
				case "shape": {
					const { id, groupId, ...data } = activeSelectedElement.element;
					const nextClipboard = {
						type: "shape",
						data: { ...data, groupId: null },
					} as const;
					setClipboard(nextClipboard);
					pasteClipboard(nextClipboard);
					break;
				}
				case "media": {
					const { id, groupId, ...data } = activeSelectedElement.element;
					const nextClipboard = {
						type: "media",
						data: { ...data, groupId: null },
					} as const;
					setClipboard(nextClipboard);
					pasteClipboard(nextClipboard);
					break;
				}
			}
			return;
		}
		selectedElements.forEach((item, index) => {
			const offset = 32 * (index + 1);
			switch (item.type) {
				case "text": {
					const { id, groupId, ...data } = item.element;
					createTextElement({
						...data,
						groupId: null,
						x: data.x + offset,
						y: data.y + offset,
					});
					break;
				}
				case "webPage": {
					const { id, groupId, ...data } = item.element;
					createWebPageElement({
						...data,
						groupId: null,
						x: data.x + offset,
						y: data.y + offset,
					});
					break;
				}
				case "youtube": {
					const { id, groupId, ...data } = item.element;
					createYouTubeElement({
						...data,
						groupId: null,
						x: data.x + offset,
						y: data.y + offset,
					});
					break;
				}
				case "qrCode": {
					const { id, groupId, ...data } = item.element;
					createQrCodeElement({
						...data,
						groupId: null,
						x: data.x + offset,
						y: data.y + offset,
					});
					break;
				}
				case "weather": {
					const { id, groupId, ...data } = item.element;
					createWeatherElement({
						...data,
						groupId: null,
						x: data.x + offset,
						y: data.y + offset,
					});
					break;
				}
				case "clock": {
					const { id, groupId, ...data } = item.element;
					createClockElement({
						...data,
						groupId: null,
						x: data.x + offset,
						y: data.y + offset,
					});
					break;
				}
				case "shape": {
					const { id, groupId, ...data } = item.element;
					createShapeElement({
						...data,
						groupId: null,
						x: data.x + offset,
						y: data.y + offset,
					});
					break;
				}
				case "media": {
					const { id, groupId, ...data } = item.element;
					createMediaElement({
						...data,
						groupId: null,
						x: data.x + offset,
						y: data.y + offset,
					});
					break;
				}
			}
		});
	}, [
		activeSelectedElement,
		createClockElement,
		createMediaElement,
		createQrCodeElement,
		createWeatherElement,
		createShapeElement,
		createTextElement,
		createYouTubeElement,
		createWebPageElement,
		pasteClipboard,
		selectedElements,
	]);

	const handlePaste = useCallback(() => {
		pasteClipboard(clipboard);
	}, [clipboard, pasteClipboard]);

	const handleDelete = useCallback(() => {
		if (!selectedElements.length) return;
		selectedElements.forEach((item) => {
			switch (item.type) {
				case "text":
					removeTextElement(item.element.id);
					break;
				case "webPage":
					removeWebPageElement(item.element.id);
					break;
				case "youtube":
					removeYouTubeElement(item.element.id);
					break;
				case "qrCode":
					removeQrCodeElement(item.element.id);
					break;
				case "weather":
					removeWeatherElement(item.element.id);
					break;
				case "clock":
					removeClockElement(item.element.id);
					break;
				case "shape":
					removeShapeElement(item.element.id);
					break;
				case "media":
					removeMediaElement(item.element.id);
					break;
			}
		});
		clearSelection();
	}, [
		clearSelection,
		removeClockElement,
		removeMediaElement,
		removeQrCodeElement,
		removeWeatherElement,
		removeShapeElement,
		removeTextElement,
		removeYouTubeElement,
		removeWebPageElement,
		selectedElements,
	]);

	const applyGroupTranslation = useCallback(
		(groupId: string, deltaX: number, deltaY: number, skipId: string) => {
			textElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateTextElement(item.id, {
						x: item.x + deltaX,
						y: item.y + deltaY,
					});
				}
			});
			webPageElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateWebPageElement(item.id, {
						x: item.x + deltaX,
						y: item.y + deltaY,
					});
				}
			});
			youTubeElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateYouTubeElement(item.id, {
						x: item.x + deltaX,
						y: item.y + deltaY,
					});
				}
			});
			qrCodeElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateQrCodeElement(item.id, {
						x: item.x + deltaX,
						y: item.y + deltaY,
					});
				}
			});
			weatherElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateWeatherElement(item.id, {
						x: item.x + deltaX,
						y: item.y + deltaY,
					});
				}
			});
			clockElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateClockElement(item.id, {
						x: item.x + deltaX,
						y: item.y + deltaY,
					});
				}
			});
			shapeElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateShapeElement(item.id, {
						x: item.x + deltaX,
						y: item.y + deltaY,
					});
				}
			});
			mediaElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateMediaElement(item.id, {
						x: item.x + deltaX,
						y: item.y + deltaY,
					});
				}
			});
		},
		[
			clockElements,
			mediaElements,
			qrCodeElements,
			weatherElements,
			shapeElements,
			textElements,
			updateClockElement,
			updateMediaElement,
			updateQrCodeElement,
			updateWeatherElement,
			updateShapeElement,
			updateTextElement,
			updateYouTubeElement,
			updateWebPageElement,
			youTubeElements,
			webPageElements,
		],
	);

	const handleGroupSelection = useCallback(() => {
		if (selectedElements.length < 2) return;
		const groupId = crypto.randomUUID();
		selectedElements.forEach((item) => {
			switch (item.type) {
				case "text":
					updateTextElement(item.element.id, { groupId });
					break;
				case "webPage":
					updateWebPageElement(item.element.id, { groupId });
					break;
				case "youtube":
					updateYouTubeElement(item.element.id, { groupId });
					break;
				case "qrCode":
					updateQrCodeElement(item.element.id, { groupId });
					break;
				case "weather":
					updateWeatherElement(item.element.id, { groupId });
					break;
				case "clock":
					updateClockElement(item.element.id, { groupId });
					break;
				case "shape":
					updateShapeElement(item.element.id, { groupId });
					break;
				case "media":
					updateMediaElement(item.element.id, { groupId });
					break;
			}
		});
	}, [
		selectedElements,
		updateClockElement,
		updateMediaElement,
		updateQrCodeElement,
		updateWeatherElement,
		updateShapeElement,
		updateTextElement,
		updateYouTubeElement,
		updateWebPageElement,
	]);

	const handleUngroupSelection = useCallback(() => {
		const groupIds = new Set(
			selectedElements
				.map((item) => item.element.groupId)
				.filter((groupId): groupId is string => Boolean(groupId)),
		);
		if (!groupIds.size) return;
		groupIds.forEach((groupId) => {
			textElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateTextElement(item.id, { groupId: null });
				}
			});
			webPageElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateWebPageElement(item.id, { groupId: null });
				}
			});
			youTubeElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateYouTubeElement(item.id, { groupId: null });
				}
			});
			qrCodeElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateQrCodeElement(item.id, { groupId: null });
				}
			});
			weatherElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateWeatherElement(item.id, { groupId: null });
				}
			});
			clockElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateClockElement(item.id, { groupId: null });
				}
			});
			shapeElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateShapeElement(item.id, { groupId: null });
				}
			});
			mediaElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateMediaElement(item.id, { groupId: null });
				}
			});
		});
	}, [
		clockElements,
		mediaElements,
		qrCodeElements,
		weatherElements,
		shapeElements,
		selectedElements,
		textElements,
		updateClockElement,
		updateMediaElement,
		updateQrCodeElement,
		updateWeatherElement,
		updateShapeElement,
		updateTextElement,
		updateYouTubeElement,
		updateWebPageElement,
		youTubeElements,
		webPageElements,
	]);

	const getSelectedNodes = useCallback(() => {
		const nodes: Konva.Node[] = [];
		selectedItems.forEach((selection) => {
			switch (selection.type) {
				case "text": {
					const node = textNodeRefs.current[selection.id];
					if (node) nodes.push(node);
					break;
				}
				case "webPage": {
					const node = webPageNodeRefs.current[selection.id];
					if (node) nodes.push(node);
					break;
				}
				case "youtube": {
					const node = youTubeNodeRefs.current[selection.id];
					if (node) nodes.push(node);
					break;
				}
				case "qrCode": {
					const node = qrCodeNodeRefs.current[selection.id];
					if (node) nodes.push(node);
					break;
				}
				case "weather": {
					const node = weatherNodeRefs.current[selection.id];
					if (node) nodes.push(node);
					break;
				}
				case "clock": {
					const node = clockNodeRefs.current[selection.id];
					if (node) nodes.push(node);
					break;
				}
				case "shape": {
					const node = shapeNodeRefs.current[selection.id];
					if (node) nodes.push(node);
					break;
				}
				case "media": {
					const node = mediaNodeRefs.current[selection.id];
					if (node) nodes.push(node);
					break;
				}
			}
		});
		return nodes;
	}, [selectedItems]);

	const updateSelectionBounds = useCallback(() => {
		const stage = stageRef.current;
		const nodes = getSelectedNodes();
		if (!stage || nodes.length === 0) {
			setSelectionBounds(null);
			return;
		}
		const rects = nodes.map((node) => node.getClientRect({ relativeTo: stage }));
		const minX = Math.min(...rects.map((rect) => rect.x));
		const minY = Math.min(...rects.map((rect) => rect.y));
		const maxX = Math.max(...rects.map((rect) => rect.x + rect.width));
		const maxY = Math.max(...rects.map((rect) => rect.y + rect.height));
		setSelectionBounds({
			x: minX,
			y: minY,
			width: maxX - minX,
			height: maxY - minY,
		});
	}, [getSelectedNodes]);

	useEffect(() => {
		updateSelectionBounds();
	}, [
		updateSelectionBounds,
		selectedClock,
		selectedMedia,
		selectedQrCode,
		selectedWeather,
		selectedShape,
		selectedItems,
		selectedText,
		selectedYouTube,
		selectedWebPage,
		scale,
		layout.pos.x,
		layout.pos.y,
	]);

	useEffect(() => {
		updateToolbarPosition();
	}, [selectionBounds, updateToolbarPosition]);

	const getNodeRect = useCallback((node: Konva.Node): AlignmentRect => {
		const relativeTo = pageLayerRef.current ?? undefined;
		const rect = node.getClientRect({ relativeTo });
		return {
			x: rect.x,
			y: rect.y,
			width: rect.width,
			height: rect.height,
		};
	}, []);

	const getAlignmentTargets = useCallback((current: Konva.Node) => {
		const nodes: Konva.Node[] = [];
		Object.values(textLabelRefs.current).forEach((node) => {
			if (node && node !== current) nodes.push(node);
		});
		Object.values(webPageNodeRefs.current).forEach((node) => {
			if (node && node !== current) nodes.push(node);
		});
		Object.values(youTubeNodeRefs.current).forEach((node) => {
			if (node && node !== current) nodes.push(node);
		});
		Object.values(qrCodeNodeRefs.current).forEach((node) => {
			if (node && node !== current) nodes.push(node);
		});
		Object.values(weatherNodeRefs.current).forEach((node) => {
			if (node && node !== current) nodes.push(node);
		});
		Object.values(clockNodeRefs.current).forEach((node) => {
			if (node && node !== current) nodes.push(node);
		});
		Object.values(shapeNodeRefs.current).forEach((node) => {
			if (node && node !== current) nodes.push(node);
		});
		Object.values(mediaNodeRefs.current).forEach((node) => {
			if (node && node !== current) nodes.push(node);
		});
		return nodes;
	}, []);

	const getAlignmentGuides = useCallback((targetNode: Konva.Node) => {
		const targetRect = getNodeRect(targetNode);
		const targetEdges = {
			left: targetRect.x,
			centerX: targetRect.x + targetRect.width / 2,
			right: targetRect.x + targetRect.width,
			top: targetRect.y,
			centerY: targetRect.y + targetRect.height / 2,
			bottom: targetRect.y + targetRect.height,
		};

		const verticalCandidates: Array<{
			value: number;
			rect?: AlignmentRect;
		}> = [{ value: DOC_DIMENSIONS.width / 2 }];
		const horizontalCandidates: Array<{
			value: number;
			rect?: AlignmentRect;
		}> = [{ value: DOC_DIMENSIONS.height / 2 }];

		getAlignmentTargets(targetNode).forEach((node) => {
			const rect = getNodeRect(node);
			verticalCandidates.push(
				{ value: rect.x, rect },
				{ value: rect.x + rect.width / 2, rect },
				{ value: rect.x + rect.width, rect },
			);
			horizontalCandidates.push(
				{ value: rect.y, rect },
				{ value: rect.y + rect.height / 2, rect },
				{ value: rect.y + rect.height, rect },
			);
		});

		const findClosest = (
			candidates: Array<{ value: number; rect?: AlignmentRect }>,
			targetPositions: number[],
		) => {
			let best: { diff: number; value: number; rect?: AlignmentRect } | null =
				null;
			candidates.forEach((candidate) => {
				targetPositions.forEach((position) => {
					const diff = candidate.value - position;
					if (Math.abs(diff) <= GUIDE_THRESHOLD) {
						if (!best || Math.abs(diff) < Math.abs(best.diff)) {
							best = { diff, value: candidate.value, rect: candidate.rect };
						}
					}
				});
			});
			return best;
		};

		const bestVertical = findClosest(verticalCandidates, [
			targetEdges.left,
			targetEdges.centerX,
			targetEdges.right,
		]);
		const bestHorizontal = findClosest(horizontalCandidates, [
			targetEdges.top,
			targetEdges.centerY,
			targetEdges.bottom,
		]);

		const guides: GuideLine[] = [];
		if (bestVertical) {
			const yStart = bestVertical.rect
				? Math.min(targetRect.y, bestVertical.rect.y)
				: 0;
			const yEnd = bestVertical.rect
				? Math.max(
						targetRect.y + targetRect.height,
						bestVertical.rect.y + bestVertical.rect.height,
					)
				: DOC_DIMENSIONS.height;
			guides.push({
				orientation: "vertical",
				points: [bestVertical.value, yStart, bestVertical.value, yEnd],
			});
		}
		if (bestHorizontal) {
			const xStart = bestHorizontal.rect
				? Math.min(targetRect.x, bestHorizontal.rect.x)
				: 0;
			const xEnd = bestHorizontal.rect
				? Math.max(
						targetRect.x + targetRect.width,
						bestHorizontal.rect.x + bestHorizontal.rect.width,
					)
				: DOC_DIMENSIONS.width;
			guides.push({
				orientation: "horizontal",
				points: [xStart, bestHorizontal.value, xEnd, bestHorizontal.value],
			});
		}

		return {
			guides,
			offset: {
				x: bestVertical?.diff ?? 0,
				y: bestHorizontal?.diff ?? 0,
			},
		};
	}, [getAlignmentTargets, getNodeRect]);

	const getPageEdgeGuides = useCallback(
		(node: Konva.Node) => {
			const stage = stageRef.current;
			const pageNode = pageRef.current;
			if (!stage || !pageNode) return [];
			const rect = node.getClientRect({
				relativeTo: stage,
				skipStroke: true,
				skipShadow: true,
			});
			const bounds = pageNode.getClientRect({
				relativeTo: stage,
				skipStroke: true,
				skipShadow: true,
			});
			const { guideTargets } = getSnapDeltaToBounds(rect, bounds, {
				x: stage.scaleX(),
				y: stage.scaleY(),
			});
			const guides: GuideLine[] = [];
			const toPageX = (value: number) => (value - layout.pos.x) / scale;
			const toPageY = (value: number) => (value - layout.pos.y) / scale;
			const pageLeft = toPageX(bounds.x);
			const pageRight = toPageX(bounds.x + bounds.width);
			const pageTop = toPageY(bounds.y);
			const pageBottom = toPageY(bounds.y + bounds.height);

			if (guideTargets.x !== undefined) {
				const x = toPageX(guideTargets.x);
				guides.push({
					orientation: "vertical",
					points: [x, pageTop, x, pageBottom],
				});
			}
			if (guideTargets.y !== undefined) {
				const y = toPageY(guideTargets.y);
				guides.push({
					orientation: "horizontal",
					points: [pageLeft, y, pageRight, y],
				});
			}

			return guides;
		},
		[layout.pos.x, layout.pos.y, scale],
	);

	const handlePageDragBoundFunc = useCallback<DragBoundFunc>(
		function handlePageDragBoundFunc(pos) {
			return makePageEdgeDragBoundFunc(this, pageRef.current)(pos);
		},
		[],
	);

	const handleDragMove = useCallback(
		(event: Konva.KonvaEventObject<DragEvent>) => {
			const node = event.target;
			const { guides, offset } = getAlignmentGuides(node);
			if (offset.x !== 0) {
				node.x(node.x() + offset.x);
			}
			if (offset.y !== 0) {
				node.y(node.y() + offset.y);
			}
			setGuideLines([...guides, ...getPageEdgeGuides(node)]);
		},
		[getAlignmentGuides, getPageEdgeGuides],
	);

	const clearGuides = useCallback(() => {
		setGuideLines([]);
	}, []);

	useEffect(() => {
		const isEditableTarget = (target: EventTarget | null) => {
			if (!target || !(target instanceof HTMLElement)) return false;
			const tag = target.tagName;
			return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (isEditableTarget(event.target)) return;
			const key = event.key.toLowerCase();
			const withModifier = event.ctrlKey || event.metaKey;

			if (withModifier && key === "a") {
				event.preventDefault();
				handleSelectAll();
				return;
			}

			if (withModifier && key === "g" && event.shiftKey) {
				event.preventDefault();
				handleUngroupSelection();
				return;
			}

			if (withModifier && key === "g") {
				event.preventDefault();
				handleGroupSelection();
				return;
			}

			if (withModifier && key === "l") {
				event.preventDefault();
				handleToggleLock();
				return;
			}

			if (withModifier && key === "c") {
				event.preventDefault();
				handleCopy();
				return;
			}

			if (withModifier && key === "v") {
				event.preventDefault();
				handlePaste();
				return;
			}

			if (event.key === "Delete") {
				event.preventDefault();
				handleDelete();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		handleCopy,
		handleDelete,
		handleGroupSelection,
		handlePaste,
		handleSelectAll,
		handleToggleLock,
		handleUngroupSelection,
	]);

	const shouldShowToolbar = selectedItems.length > 0;
	const toolbarPortal = shouldShowToolbar
		? createPortal(
				<div
					ref={toolbarRef}
					className="fixed z-40 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm"
					style={{
						left: toolbarPosition.left,
						top: toolbarPosition.top,
						transform: "translateX(-50%)",
					}}
				>
					<div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
						<button
							type="button"
							className={`rounded-full px-3 py-1 text-xs font-semibold ${
								selectionIsLocked
									? "bg-slate-900 text-white"
									: "text-slate-600 hover:bg-slate-100"
							}`}
							onClick={handleToggleLock}
						>
							{selectionIsLocked ? "解除鎖定" : "鎖定"}
						</button>
						<button
							type="button"
							className="rounded-full px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
							onClick={handleDuplicate}
						>
							複製
						</button>
						<button
							type="button"
							className="rounded-full px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
							onClick={handleDelete}
						>
							刪除
						</button>
					</div>
				</div>,
				document.body,
			)
		: null;

	return (
		<main
			ref={mainRef}
			className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-slate-50 [grid-area:editor]"
		>
			{toolbarPortal}
			<section className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
				{/* workspace：灰底，不要用虛線框 */}
				<div
					ref={viewportRef}
					className="canvasScroller relative h-full w-full min-h-0 min-w-0 bg-slate-100"
					style={viewportOverflowStyle}
				>
					<Stage
						ref={stageRef}
						width={canvasSize.width}
						height={canvasSize.height}
						onWheel={handleWheel}
						className="cursor-default"
						onMouseDown={(event) => {
							if (event.target === event.target.getStage()) {
								clearSelection();
								return;
							}
							if (event.target.name() === "page") {
								clearSelection();
							}
						}}
					>
						{/* Page Layer：縮放與平移都作用在這層 */}
						<Layer
							ref={pageLayerRef}
							x={layout.pos.x}
							y={layout.pos.y}
							scaleX={scale}
							scaleY={scale}
						>
							{/* Page（固定 3840x2160），用陰影/邊框讓它像 Canva 的紙 */}
							<Rect
								ref={pageRef}
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
								<Label
									key={item.id}
									ref={(node) => {
										textLabelRefs.current[item.id] = node;
									}}
									x={item.x}
									y={item.y}
									draggable={!item.locked}
									dragBoundFunc={handlePageDragBoundFunc}
									onClick={() => {
										handleSelectItem({ type: "text", id: item.id }, item.groupId);
									}}
									onTap={() => {
										handleSelectItem({ type: "text", id: item.id }, item.groupId);
									}}
									onDblClick={() => {
										const node = textNodeRefs.current[item.id];
										if (node) startEditingText(node, item.id);
									}}
									onDblTap={() => {
										const node = textNodeRefs.current[item.id];
										if (node) startEditingText(node, item.id);
									}}
									onDragMove={handleDragMove}
									onDragEnd={(event) => {
										const nextX = event.target.x();
										const nextY = event.target.y();
										updateTextElement(item.id, {
											x: nextX,
											y: nextY,
										});
										if (item.groupId) {
											applyGroupTranslation(
												item.groupId,
												nextX - item.x,
												nextY - item.y,
												item.id,
											);
										}
										clearGuides();
									}}
									onTransformEnd={(event) => {
										const node = event.target as Konva.Label;
										const scaleX = node.scaleX();
										const scaleY = node.scaleY();
										snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
										node.scaleX(1);
										node.scaleY(1);
										const textNode = textNodeRefs.current[item.id];
										if (!textNode) return;
										updateTextElement(item.id, {
											x: node.x(),
											y: node.y(),
											width: Math.max(
												MIN_TEXT_WIDTH,
												textNode.width() * scaleX,
											),
											fontSize: clampTextSize(textNode.fontSize() * scaleY),
										});
									}}
								>
									{item.backgroundColor !== "transparent" ? (
										<Tag fill={item.backgroundColor} cornerRadius={6} />
									) : null}
									<KonvaText
										ref={(node) => {
											textNodeRefs.current[item.id] = node;
										}}
										text={item.text}
										width={item.width}
										fontSize={item.fontSize}
										fontFamily={item.fontFamily}
										fontStyle={item.fontStyle}
										textDecoration={item.textDecoration}
										align={item.align}
										fill={item.fill}
									/>
								</Label>
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
										draggable={!item.locked}
										dragBoundFunc={handlePageDragBoundFunc}
										onClick={() => {
											handleSelectItem(
												{ type: "webPage", id: item.id },
												item.groupId,
											);
										}}
										onTap={() => {
											handleSelectItem(
												{ type: "webPage", id: item.id },
												item.groupId,
											);
										}}
										onDragMove={handleDragMove}
										onDragEnd={(event) => {
											const nextX = event.target.x();
											const nextY = event.target.y();
											updateWebPageElement(item.id, {
												x: nextX,
												y: nextY,
											});
											if (item.groupId) {
												applyGroupTranslation(
													item.groupId,
													nextX - item.x,
													nextY - item.y,
													item.id,
												);
											}
											clearGuides();
										}}
										onTransformEnd={(event) => {
											const node = event.target as Konva.Rect;
											const scaleX = node.scaleX();
											const scaleY = node.scaleY();
											snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
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
							{youTubeElements.map((item) => (
								<Fragment key={item.id}>
									<Rect
										ref={(node) => {
											youTubeNodeRefs.current[item.id] = node;
										}}
										x={item.x}
										y={item.y}
										width={item.width}
										height={item.height}
										fill="#fef2f2"
										stroke="#f87171"
										strokeWidth={2 / scale}
										cornerRadius={12 / scale}
										draggable={!item.locked}
										dragBoundFunc={handlePageDragBoundFunc}
										onClick={() => {
											handleSelectItem(
												{ type: "youtube", id: item.id },
												item.groupId,
											);
										}}
										onTap={() => {
											handleSelectItem(
												{ type: "youtube", id: item.id },
												item.groupId,
											);
										}}
										onDragMove={handleDragMove}
										onDragEnd={(event) => {
											const nextX = event.target.x();
											const nextY = event.target.y();
											updateYouTubeElement(item.id, {
												x: nextX,
												y: nextY,
											});
											if (item.groupId) {
												applyGroupTranslation(
													item.groupId,
													nextX - item.x,
													nextY - item.y,
													item.id,
												);
											}
											clearGuides();
										}}
										onTransformEnd={(event) => {
											const node = event.target as Konva.Rect;
											const scaleX = node.scaleX();
											const scaleY = node.scaleY();
											snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
											node.scaleX(1);
											node.scaleY(1);
											const nextWidth = Math.max(200, node.width() * scaleX);
											const nextHeight = Math.max(120, node.height() * scaleY);
											updateYouTubeElement(item.id, {
												x: node.x(),
												y: node.y(),
												width: nextWidth,
												height: nextHeight,
											});
										}}
									/>
									<KonvaText
										text={buildYouTubeLabel(item)}
										x={item.x}
										y={item.y}
										width={item.width}
										height={item.height}
										align="center"
										verticalAlign="middle"
										fontSize={42}
										fill="#991b1b"
										listening={false}
									/>
								</Fragment>
							))}
							{qrCodeElements.map((item) => (
								<QrCodeNode
									key={item.id}
									element={item}
									isLocked={item.locked}
									nodeRef={(node) => {
										qrCodeNodeRefs.current[item.id] = node;
									}}
									dragBoundFunc={handlePageDragBoundFunc}
									onSelect={() => {
										handleSelectItem(
											{ type: "qrCode", id: item.id },
											item.groupId,
										);
									}}
									onDragMove={handleDragMove}
									onDragEnd={(position) => {
										updateQrCodeElement(item.id, position);
										if (item.groupId) {
											applyGroupTranslation(
												item.groupId,
												position.x - item.x,
												position.y - item.y,
												item.id,
											);
										}
										clearGuides();
									}}
									onTransformEnd={(node) => {
										const scaleX = node.scaleX();
										const scaleY = node.scaleY();
										snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
										node.scaleX(1);
										node.scaleY(1);
										const nextSize = Math.max(
											MIN_QR_SIZE,
											node.width() * Math.max(scaleX, scaleY),
										);
										updateQrCodeElement(item.id, {
											x: node.x(),
											y: node.y(),
											size: nextSize,
										});
									}}
								/>
							))}
							{weatherElements.map((item) => {
								const isSquare = item.mainAreaStyle === "square";
								const baseSize = item.height;
								const padding = Math.max(16, baseSize * 0.08);
								const titleFontSize = Math.max(18, baseSize * 0.1);
								const tempFontSize = Math.max(64, baseSize * 0.32);
								const metaFontSize = Math.max(14, baseSize * 0.08);
								const smallFontSize = Math.max(12, baseSize * 0.07);
								const tinyFontSize = Math.max(11, baseSize * 0.06);
								const iconSize = Math.max(20, baseSize * 0.12);
								const cityLabel =
									item.city?.trim() || item.country?.trim()
										? `${item.city || "City"}${item.country ? `, ${item.country}` : ""}`
										: "City Name";
								const summaryLabel = "Mostly Cloudy (Day)";
								const forecast = [
									{ iconIndex: 0, high: 24, low: 16 },
									{ iconIndex: 1, high: 20, low: 15 },
									{ iconIndex: 2, high: 16, low: 14 },
									{ iconIndex: 3, high: 16, low: 14 },
									{ iconIndex: 4, high: 18, low: 14 },
								];
								return (
									<Group
										key={item.id}
										ref={(node) => {
											weatherNodeRefs.current[item.id] = node;
										}}
										x={item.x}
										y={item.y}
										draggable={!item.locked}
										dragBoundFunc={handlePageDragBoundFunc}
										onClick={() => {
											handleSelectItem(
												{ type: "weather", id: item.id },
												item.groupId,
											);
										}}
										onTap={() => {
											handleSelectItem(
												{ type: "weather", id: item.id },
												item.groupId,
											);
										}}
										onDragMove={handleDragMove}
										onDragEnd={(event) => {
											const nextX = event.target.x();
											const nextY = event.target.y();
											updateWeatherElement(item.id, {
												x: nextX,
												y: nextY,
											});
											if (item.groupId) {
												applyGroupTranslation(
													item.groupId,
													nextX - item.x,
													nextY - item.y,
													item.id,
												);
											}
											clearGuides();
										}}
										onTransformEnd={(event) => {
											const node = event.target as Konva.Group;
											const scaleX = node.scaleX();
											const scaleY = node.scaleY();
											snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
											node.scaleX(1);
											node.scaleY(1);
											const nextWidth = Math.max(
												MIN_WEATHER_WIDTH,
												item.width * Math.max(scaleX, scaleY),
											);
											const nextHeight = Math.max(
												MIN_WEATHER_HEIGHT,
												nextWidth / WEATHER_ASPECT_RATIO,
											);
											updateWeatherElement(item.id, {
												x: node.x(),
												y: node.y(),
												width: nextHeight * WEATHER_ASPECT_RATIO,
												height: nextHeight,
											});
										}}
									>
										<Rect
											width={item.width}
											height={item.height}
											fill={item.backgroundColor}
										/>
										{isSquare ? (
											<>
												<KonvaText
													text={cityLabel}
													x={0}
													y={padding * 0.5}
													width={item.width}
													align="center"
													fontSize={titleFontSize}
													fill={item.textColor}
													listening={false}
												/>
												<KonvaText
													text="21°"
													x={padding}
													y={padding * 2}
													width={item.width * 0.45}
													fontSize={tempFontSize}
													align="left"
													fill={item.textColor}
													listening={false}
												/>
												<KonvaImage
													image={weatherIconImages.current ?? undefined}
													x={item.width * 0.6}
													y={padding * 2.05}
													width={iconSize}
													height={iconSize}
													listening={false}
												/>
												<KonvaText
													text="21° / 14°"
													x={item.width * 0.6 + iconSize * 1.1}
													y={padding * 2.25}
													fontSize={metaFontSize}
													fill={item.textColor}
													listening={false}
												/>
												<KonvaText
													text={summaryLabel}
													x={item.width * 0.55}
													y={padding * 2.3 + metaFontSize * 1.6}
													width={item.width * 0.4}
													align="center"
													fontSize={smallFontSize}
													lineHeight={1.4}
													fill={item.textColor}
													listening={false}
												/>
												{forecast.map((itemForecast, index) => {
													const columnWidth = item.width / forecast.length;
													const startX = index * columnWidth;
													const top = item.height * 0.63;
													const iconImage =
														weatherIconImages.forecast[itemForecast.iconIndex] ??
														weatherIconImages.current;
													return (
														<Fragment key={`${item.id}-forecast-${index}`}>
															{index > 0 ? (
																<Line
																	points={[
																		startX,
																		top + padding * 0.2,
																		startX,
																		item.height - padding * 0.6,
																	]}
																	stroke={item.textColor}
																	strokeWidth={1 / scale}
																	opacity={0.2}
																	listening={false}
																/>
															) : null}
															<KonvaImage
																image={iconImage ?? undefined}
																x={startX + (columnWidth - iconSize * 0.7) / 2}
																y={top}
																width={iconSize * 0.7}
																height={iconSize * 0.7}
																listening={false}
															/>
															<KonvaText
																text={`${itemForecast.high}°`}
																x={startX}
																y={top + iconSize * 0.9}
																width={columnWidth}
																align="center"
																fontSize={tinyFontSize}
																fill={item.textColor}
																listening={false}
															/>
															<KonvaText
																text={`${itemForecast.low}°`}
																x={startX}
																y={top + iconSize * 1.7}
																width={columnWidth}
																align="center"
																fontSize={tinyFontSize}
																fill={item.textColor}
																listening={false}
															/>
														</Fragment>
													);
												})}
											</>
										) : (
											<>
												<KonvaText
													text={cityLabel}
													x={padding}
													y={padding * 0.6}
													width={item.width * 0.45 - padding}
													align="left"
													fontSize={titleFontSize}
													fill={item.textColor}
													listening={false}
												/>
												<KonvaText
													text="21°"
													x={padding}
													y={item.height * 0.25}
													width={item.width * 0.45 - padding}
													fontSize={tempFontSize}
													align="left"
													fill={item.textColor}
													listening={false}
												/>
												<KonvaText
													text="21° / 14°"
													x={padding}
													y={item.height * 0.62}
													width={item.width * 0.45 - padding}
													fontSize={metaFontSize}
													fill={item.textColor}
													listening={false}
												/>
												<KonvaText
													text={summaryLabel}
													x={padding}
													y={item.height * 0.7}
													width={item.width * 0.45 - padding}
													fontSize={smallFontSize}
													lineHeight={1.4}
													fill={item.textColor}
													listening={false}
												/>
												{forecast.map((itemForecast, index) => {
													const left = item.width * 0.5;
													const rowHeight = item.height / forecast.length;
													const rowTop = rowHeight * index;
													const iconImage =
														weatherIconImages.forecast[itemForecast.iconIndex] ??
														weatherIconImages.current;
													return (
														<Fragment key={`${item.id}-list-${index}`}>
															{index > 0 ? (
																<Line
																	points={[
																		left,
																		rowTop,
																		item.width - padding * 0.5,
																		rowTop,
																	]}
																	stroke={item.textColor}
																	strokeWidth={1 / scale}
																	opacity={0.2}
																	listening={false}
																/>
															) : null}
															<KonvaImage
																image={iconImage ?? undefined}
																x={left + padding * 0.3}
																y={rowTop + rowHeight * 0.2}
																width={iconSize * 0.7}
																height={iconSize * 0.7}
																listening={false}
															/>
															<KonvaText
																text={`${itemForecast.high}°`}
																x={item.width * 0.78}
																y={rowTop + rowHeight * 0.32}
																fontSize={metaFontSize}
																fill={item.textColor}
																listening={false}
															/>
															<KonvaText
																text={`${itemForecast.low}°`}
																x={item.width * 0.9}
																y={rowTop + rowHeight * 0.32}
																fontSize={metaFontSize}
																fill={item.textColor}
																listening={false}
															/>
														</Fragment>
													);
												})}
											</>
										)}
									</Group>
								);
							})}
							{clockElements.map((item) => {
								const isAnalog = item.type === "analog";
								const clockLines = buildClockLines(clockNow, item);
								const displayText = clockLines.join("\n");
								const showBackground = item.backgroundColor !== "transparent";
								const analogAssets =
									item.type === "analog"
										? analogClockImages[item.theme] ?? analogClockImages.light
										: null;
								const analogSize = Math.min(item.width, item.height);
								const analogOffsetX = (item.width - analogSize) / 2;
								const analogOffsetY = (item.height - analogSize) / 2;
								const centerX = analogOffsetX + analogSize / 2;
								const centerY = analogOffsetY + analogSize / 2;
								const analogHandSize = analogSize * 0.92;
								const getHandDimensions = (image: HTMLImageElement | null) => {
									const height = analogHandSize;
									if (!image || image.height === 0) {
										return {
											width: analogHandSize,
											height: analogHandSize,
											offsetX: analogHandSize / 2,
											offsetY: analogHandSize / 2,
										};
									}
									const aspectRatio = image.width / image.height;
									const width = height * aspectRatio;
									return {
										width,
										height,
										offsetX: width / 2,
										offsetY: height / 2,
									};
								};
								const analogAngles = isAnalog
									? getAnalogClockAngles(clockNow)
									: null;
								const hourDimensions = getHandDimensions(analogAssets?.hour ?? null);
								const minuteDimensions = getHandDimensions(
									analogAssets?.minute ?? null,
								);
								const secondDimensions = getHandDimensions(
									analogAssets?.second ?? null,
								);
								return (
									<Group
										key={item.id}
										ref={(node) => {
											clockNodeRefs.current[item.id] = node;
										}}
										x={item.x}
										y={item.y}
										draggable={!item.locked}
										dragBoundFunc={handlePageDragBoundFunc}
										onClick={() => {
											handleSelectItem(
												{ type: "clock", id: item.id },
												item.groupId,
											);
										}}
										onTap={() => {
											handleSelectItem(
												{ type: "clock", id: item.id },
												item.groupId,
											);
										}}
										onDragMove={handleDragMove}
										onDragEnd={(event) => {
											const nextX = event.target.x();
											const nextY = event.target.y();
											updateClockElement(item.id, {
												x: nextX,
												y: nextY,
											});
											if (item.groupId) {
												applyGroupTranslation(
													item.groupId,
													nextX - item.x,
													nextY - item.y,
													item.id,
												);
											}
											clearGuides();
										}}
										onTransformEnd={(event) => {
											const node = event.target as Konva.Group;
											const scaleX = node.scaleX();
											const scaleY = node.scaleY();
											snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
											node.scaleX(1);
											node.scaleY(1);
											updateClockElement(item.id, {
												x: node.x(),
												y: node.y(),
												width: Math.max(
													MIN_CLOCK_WIDTH,
													item.width * scaleX,
												),
												height: Math.max(
													MIN_CLOCK_HEIGHT,
													item.height * scaleY,
												),
												fontSize: clamp(
													Math.round(
														item.fontSize * Math.max(scaleX, scaleY),
													),
													MIN_CLOCK_FONT_SIZE,
													MAX_CLOCK_FONT_SIZE,
												),
											});
										}}
									>
										{isAnalog ? (
											<>
												<KonvaImage
													image={analogAssets?.circle ?? undefined}
													x={analogOffsetX}
													y={analogOffsetY}
													width={analogSize}
													height={analogSize}
												/>
												<KonvaImage
													image={analogAssets?.dial ?? undefined}
													x={analogOffsetX}
													y={analogOffsetY}
													width={analogSize}
													height={analogSize}
												/>
												<KonvaImage
													image={analogAssets?.hour ?? undefined}
													x={centerX}
													y={centerY}
													offsetX={hourDimensions.offsetX}
													offsetY={hourDimensions.offsetY}
													width={hourDimensions.width}
													height={hourDimensions.height}
													rotation={analogAngles?.hour ?? 0}
												/>
												<KonvaImage
													image={analogAssets?.minute ?? undefined}
													x={centerX}
													y={centerY}
													offsetX={minuteDimensions.offsetX}
													offsetY={minuteDimensions.offsetY}
													width={minuteDimensions.width}
													height={minuteDimensions.height}
													rotation={analogAngles?.minute ?? 0}
												/>
												<KonvaImage
													image={analogAssets?.second ?? undefined}
													x={centerX}
													y={centerY}
													offsetX={secondDimensions.offsetX}
													offsetY={secondDimensions.offsetY}
													width={secondDimensions.width}
													height={secondDimensions.height}
													rotation={analogAngles?.second ?? 0}
												/>
											</>
										) : (
											<>
												<Rect
													width={item.width}
													height={item.height}
													fill={
														showBackground
															? item.backgroundColor
															: "transparent"
													}
													cornerRadius={12}
												/>
												<KonvaText
													text={displayText}
													x={0}
													y={0}
													width={item.width}
													height={item.height}
													align="center"
													verticalAlign="middle"
													fontSize={item.fontSize}
													fontFamily="Noto Sans TC"
													fontStyle="bold"
													fill={item.textColor}
													lineHeight={1.2}
												/>
											</>
										)}
									</Group>
								);
							})}
							{mediaElements.map((item) => {
								if (item.kind === "image") {
									return (
										<MediaImageNode
											key={item.id}
											element={item}
											isLocked={item.locked}
											nodeRef={(node) => {
												mediaNodeRefs.current[item.id] = node;
											}}
											dragBoundFunc={handlePageDragBoundFunc}
											onSelect={() => {
												handleSelectItem(
													{ type: "media", id: item.id },
													item.groupId,
												);
											}}
											onDragMove={handleDragMove}
											onDragEnd={(position) => {
												updateMediaElement(item.id, position);
												if (item.groupId) {
													applyGroupTranslation(
														item.groupId,
														position.x - item.x,
														position.y - item.y,
														item.id,
													);
												}
												clearGuides();
											}}
											onTransformEnd={(node) => {
												const scaleX = node.scaleX();
												const scaleY = node.scaleY();
												snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
												node.scaleX(1);
												node.scaleY(1);
												updateMediaElement(item.id, {
													x: node.x(),
													y: node.y(),
													width: Math.max(
														MIN_MEDIA_WIDTH,
														node.width() * scaleX,
													),
													height: Math.max(
														MIN_MEDIA_HEIGHT,
														node.height() * scaleY,
													),
												});
											}}
										/>
									);
								}

								return (
									<Fragment key={item.id}>
										<Rect
											ref={(node) => {
												mediaNodeRefs.current[item.id] = node;
											}}
											x={item.x}
											y={item.y}
											width={item.width}
											height={item.height}
											fill="#f1f5f9"
											stroke="#94a3b8"
											strokeWidth={2 / scale}
											cornerRadius={12 / scale}
											draggable={!item.locked}
											dragBoundFunc={handlePageDragBoundFunc}
											onClick={() => {
												handleSelectItem(
													{ type: "media", id: item.id },
													item.groupId,
												);
											}}
											onTap={() => {
												handleSelectItem(
													{ type: "media", id: item.id },
													item.groupId,
												);
											}}
											onDragMove={handleDragMove}
											onDragEnd={(event) => {
												const nextX = event.target.x();
												const nextY = event.target.y();
												updateMediaElement(item.id, {
													x: nextX,
													y: nextY,
												});
												if (item.groupId) {
													applyGroupTranslation(
														item.groupId,
														nextX - item.x,
														nextY - item.y,
														item.id,
													);
												}
												clearGuides();
											}}
											onTransformEnd={(event) => {
												const node = event.target as Konva.Rect;
												const scaleX = node.scaleX();
												const scaleY = node.scaleY();
												snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
												node.scaleX(1);
												node.scaleY(1);
												updateMediaElement(item.id, {
													x: node.x(),
													y: node.y(),
													width: Math.max(
														MIN_MEDIA_WIDTH,
														node.width() * scaleX,
													),
													height: Math.max(
														MIN_MEDIA_HEIGHT,
														node.height() * scaleY,
													),
												});
											}}
										/>
										<KonvaText
											text={item.name}
											x={item.x}
											y={item.y}
											width={item.width}
											height={item.height}
											align="center"
											verticalAlign="middle"
											fontSize={36}
											fill="#334155"
											listening={false}
										/>
										<KonvaText
											text={item.kind.toUpperCase()}
											x={item.x}
											y={item.y + 24}
											width={item.width}
											height={item.height}
											align="center"
											fontSize={20}
											fill="#94a3b8"
											listening={false}
										/>
									</Fragment>
								);
							})}
							{shapeElements.map((item) => {
								const commonProps = {
									key: item.id,
									ref: (node: Konva.Shape | null) => {
										shapeNodeRefs.current[item.id] = node;
									},
									x: item.x,
									y: item.y,
									fill: item.fill,
									draggable: !item.locked,
									dragBoundFunc: handlePageDragBoundFunc,
									offsetX: item.width / 2,
									offsetY: item.height / 2,
									onClick: () => {
										handleSelectItem(
											{ type: "shape", id: item.id },
											item.groupId,
										);
									},
									onTap: () => {
										handleSelectItem(
											{ type: "shape", id: item.id },
											item.groupId,
										);
									},
									onDragMove: handleDragMove,
									onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
										const nextX = event.target.x();
										const nextY = event.target.y();
										updateShapeElement(item.id, {
											x: nextX,
											y: nextY,
										});
										if (item.groupId) {
											applyGroupTranslation(
												item.groupId,
												nextX - item.x,
												nextY - item.y,
												item.id,
											);
										}
										clearGuides();
									},
									onTransformEnd: (
										event: Konva.KonvaEventObject<Event>,
									) => {
										const node = event.target as Konva.Shape;
										const scaleX = node.scaleX();
										const scaleY = node.scaleY();
										snapNodeToPageEdgesOnTransformEnd(node, pageRef.current);
										const nextWidth = Math.max(
											MIN_SHAPE_SIZE,
											item.width * scaleX,
										);
										const nextHeight = Math.max(
											MIN_SHAPE_SIZE,
											item.height * scaleY,
										);
										node.scaleX(1);
										node.scaleY(1);
										updateShapeElement(item.id, {
											x: node.x(),
											y: node.y(),
											width: nextWidth,
											height: nextHeight,
										});
									},
								};

								if (item.type === "circle") {
									return (
										<Ellipse
											{...commonProps}
											radiusX={item.width / 2}
											radiusY={item.height / 2}
										/>
									);
								}

								if (item.type === "triangle") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS.triangle,
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "triangle-inverted") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS["triangle-inverted"],
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "diamond") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS.diamond,
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "plus") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS.plus,
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "pentagon") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS.pentagon,
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "hexagon") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS.hexagon,
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "trapezoid") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS.trapezoid,
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "parallelogram") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS.parallelogram,
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "right-triangle") {
									return (
										<Line
											{...commonProps}
											points={normalizePoints(
												SHAPE_POINTS["right-triangle"],
												item.width,
												item.height,
											)}
											closed
										/>
									);
								}

								if (item.type === "rounded-rectangle") {
									return (
										<Rect
											{...commonProps}
											width={item.width}
											height={item.height}
											cornerRadius={Math.min(
												item.width,
												item.height,
											) / 4}
										/>
									);
								}

								return (
									<Rect
										{...commonProps}
										width={item.width}
										height={item.height}
										cornerRadius={8}
									/>
								);
							})}
							{guideLines.map((guide, index) => (
								<Line
									key={`${guide.orientation}-${index}`}
									points={guide.points}
									stroke="rgba(14, 165, 233, 0.35)"
									strokeWidth={1 / scale}
									dash={[6 / scale, 6 / scale]}
									listening={false}
								/>
							))}
							<Transformer
								ref={transformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(oldBox, newBox) =>
									clampBox(oldBox, newBox, {
										layerScale: scale,
										minWDoc: MIN_TEXT_WIDTH,
										minHDoc: MIN_TEXT_SIZE * 1.5,
										maxWDoc: Number.POSITIVE_INFINITY,
										maxHDoc: Number.POSITIVE_INFINITY,
									})
								}
							/>
							<Transformer
								ref={webPageTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(oldBox, newBox) =>
									clampBox(oldBox, newBox, {
										layerScale: scale,
										minWDoc: 200,
										minHDoc: 120,
										maxWDoc: Number.POSITIVE_INFINITY,
										maxHDoc: Number.POSITIVE_INFINITY,
									})
								}
							/>
							<Transformer
								ref={youTubeTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(oldBox, newBox) =>
									clampBox(oldBox, newBox, {
										layerScale: scale,
										minWDoc: 200,
										minHDoc: 120,
										maxWDoc: Number.POSITIVE_INFINITY,
										maxHDoc: Number.POSITIVE_INFINITY,
									})
								}
							/>
							<Transformer
								ref={qrCodeTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(oldBox, newBox) =>
									clampBox(oldBox, newBox, {
										layerScale: scale,
										minWDoc: MIN_QR_SIZE,
										minHDoc: MIN_QR_SIZE,
										maxWDoc: Number.POSITIVE_INFINITY,
										maxHDoc: Number.POSITIVE_INFINITY,
									})
								}
							/>
							<Transformer
								ref={weatherTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(oldBox, newBox) =>
									clampBox(oldBox, newBox, {
										layerScale: scale,
										minWDoc: MIN_WEATHER_WIDTH,
										minHDoc: MIN_WEATHER_HEIGHT,
										maxWDoc: Number.POSITIVE_INFINITY,
										maxHDoc: Number.POSITIVE_INFINITY,
										aspectRatio: WEATHER_ASPECT_RATIO,
									})
								}
							/>
							<Transformer
								ref={clockTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(oldBox, newBox) =>
									clampBox(oldBox, newBox, {
										layerScale: scale,
										minWDoc: MIN_CLOCK_WIDTH,
										minHDoc: MIN_CLOCK_HEIGHT,
										maxWDoc: Number.POSITIVE_INFINITY,
										maxHDoc: Number.POSITIVE_INFINITY,
									})
								}
							/>
							<Transformer
								ref={shapeTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(oldBox, newBox) =>
									clampBox(oldBox, newBox, {
										layerScale: scale,
										minWDoc: MIN_SHAPE_SIZE,
										minHDoc: MIN_SHAPE_SIZE,
										maxWDoc: Number.POSITIVE_INFINITY,
										maxHDoc: Number.POSITIVE_INFINITY,
									})
								}
							/>
							<Transformer
								ref={mediaTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(oldBox, newBox) =>
									clampBox(oldBox, newBox, {
										layerScale: scale,
										minWDoc: MIN_MEDIA_WIDTH,
										minHDoc: MIN_MEDIA_HEIGHT,
										maxWDoc: Number.POSITIVE_INFINITY,
										maxHDoc: Number.POSITIVE_INFINITY,
									})
								}
							/>
						</Layer>
						{guideLines.length ? (
							<Layer
								x={layout.pos.x}
								y={layout.pos.y}
								scaleX={scale}
								scaleY={scale}
								listening={false}
							>
								{guideLines.map((guide, index) => (
									<Line
										key={`${guide.orientation}-${index}`}
										points={guide.points}
										stroke="rgba(14, 165, 233, 0.8)"
										strokeWidth={1 / scale}
										dash={[8 / scale, 6 / scale]}
										listening={false}
									/>
								))}
							</Layer>
						) : null}
						{selectionBounds && selectedItems.length > 1 ? (
							<Layer listening={false}>
								<Rect
									x={selectionBounds.x}
									y={selectionBounds.y}
									width={selectionBounds.width}
									height={selectionBounds.height}
									stroke="#0ea5e9"
									strokeWidth={1}
									dash={[6, 4]}
								/>
							</Layer>
						) : null}
					</Stage>
				</div>
			</section>

			<Footer
				zoomPercent={zoomPercent}
				onZoomChange={handleZoomChange}
				onFit={fitToScreen}
				onReset={() => {
					const c = viewportRef.current;
					if (!c) return;
					const nextScale = 1;
					const vw = Math.max(1, Math.floor(c.clientWidth));
					const vh = Math.max(1, Math.floor(c.clientHeight));
					setScale(nextScale);
					setMode("custom");
					requestAnimationFrame(() => {
						const { stageW, stageH } = computeLayout(vw, vh, nextScale);
						centerScroll(stageW, stageH, vw, vh);
					});
				}}
			/>
		</main>
	);
}
