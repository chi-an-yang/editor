import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const DOC_DIMENSIONS = { width: 3840, height: 2160 };
export const CLOCK_DEFAULT_SIZE = { width: 720, height: 180 };
const BASELINE_HEIGHT = 1080;
const FONT_SCALE_RATIO = DOC_DIMENSIONS.height / BASELINE_HEIGHT;
const BASE_BODY_FONT = 24;
const BASE_HEADING_FONT = 60;

export type TextElement = {
	id: string;
	text: string;
	x: number;
	y: number;
	width?: number;
	fontSize: number;
	fontFamily: string;
	fontStyle: string;
	textDecoration: string;
	align: "left" | "center" | "right";
	fill: string;
	backgroundColor: string;
	animation: "horizontal" | "vertical" | "static";
	locked: boolean;
	groupId: string | null;
};

export type WebPageElement = {
	id: string;
	url: string;
	x: number;
	y: number;
	width: number;
	height: number;
	locked: boolean;
	groupId: string | null;
};

export type QrCodeElement = {
	id: string;
	text: string;
	x: number;
	y: number;
	size: number;
	locked: boolean;
	groupId: string | null;
};

export type ClockDisplayFormat =
	| "time"
	| "date"
	| "time-date-one-line"
	| "time-date-two-lines"
	| "date-time-one-line"
	| "date-time-two-lines";

export type ClockTimeFormat = "24h-seconds" | "12h-prefix" | "12h-seconds" | "12h";

export type ClockElement = {
	id: string;
	displayFormat: ClockDisplayFormat;
	timeFormat: ClockTimeFormat;
	fontSize: number;
	textColor: string;
	backgroundColor: string;
	x: number;
	y: number;
	width: number;
	height: number;
	locked: boolean;
	groupId: string | null;
};

export type ShapeType =
	| "rectangle"
	| "rounded-rectangle"
	| "circle"
	| "triangle"
	| "triangle-inverted"
	| "diamond"
	| "plus"
	| "pentagon"
	| "hexagon"
	| "trapezoid"
	| "parallelogram"
	| "right-triangle";

export type ShapeElement = {
	id: string;
	type: ShapeType;
	x: number;
	y: number;
	width: number;
	height: number;
	fill: string;
	locked: boolean;
	groupId: string | null;
};

export type MediaKind = "image" | "video" | "audio" | "document";

export type MediaElement = {
	id: string;
	kind: MediaKind;
	name: string;
	src?: string;
	x: number;
	y: number;
	width: number;
	height: number;
	locked: boolean;
	groupId: string | null;
};

export type WidgetType = "text" | "webPage" | "qrCode" | "clock" | "shape" | "media";

export type TextWidgetProps = Pick<
	TextElement,
	| "text"
	| "fontSize"
	| "fontFamily"
	| "fontStyle"
	| "textDecoration"
	| "align"
	| "fill"
	| "backgroundColor"
	| "animation"
>;

export type WebPageWidgetProps = Pick<WebPageElement, "url">;

export type QrCodeWidgetProps = Pick<QrCodeElement, "text" | "size">;

export type ClockWidgetProps = Pick<
	ClockElement,
	"displayFormat" | "timeFormat" | "fontSize" | "textColor" | "backgroundColor"
>;

export type ShapeWidgetProps = Pick<ShapeElement, "type" | "fill">;

export type MediaWidgetProps = Pick<MediaElement, "kind" | "name" | "src">;

export type WidgetPropsMap = {
	text: TextWidgetProps;
	webPage: WebPageWidgetProps;
	qrCode: QrCodeWidgetProps;
	clock: ClockWidgetProps;
	shape: ShapeWidgetProps;
	media: MediaWidgetProps;
};

export type WidgetProps = WidgetPropsMap[WidgetType];

type WidgetBase<TType extends WidgetType, TProps> = {
	id: string;
	type: TType;
	x: number;
	y: number;
	width?: number;
	height?: number;
	props: TProps;
};

export type TextWidget = WidgetBase<"text", TextWidgetProps>;
export type WebPageWidget = WidgetBase<"webPage", WebPageWidgetProps>;
export type QrCodeWidget = WidgetBase<"qrCode", QrCodeWidgetProps>;
export type ClockWidget = WidgetBase<"clock", ClockWidgetProps>;
export type ShapeWidget = WidgetBase<"shape", ShapeWidgetProps>;
export type MediaWidget = WidgetBase<"media", MediaWidgetProps>;

export type Widget =
	| TextWidget
	| WebPageWidget
	| QrCodeWidget
	| ClockWidget
	| ShapeWidget
	| MediaWidget;

export type EditorContextValue = {
	textElements: TextElement[];
	selectedTextId: string | null;
	webPageElements: WebPageElement[];
	selectedWebPageId: string | null;
	qrCodeElements: QrCodeElement[];
	selectedQrCodeId: string | null;
	clockElements: ClockElement[];
	selectedClockId: string | null;
	shapeElements: ShapeElement[];
	selectedShapeId: string | null;
	mediaElements: MediaElement[];
	selectedMediaId: string | null;
	selectedWidgetId: string | null;
	widgetsById: Record<string, Widget>;
	addTextElement: () => void;
	addHeadingElement: () => void;
	addWebPageElement: (url: string) => void;
	addQrCodeElement: (text: string) => void;
	addClockElement: (
		element: Pick<
			ClockElement,
			"displayFormat" | "timeFormat" | "fontSize" | "textColor" | "backgroundColor"
		>,
	) => void;
	addShapeElement: (type: ShapeType) => void;
	addMediaElement: (
		media: Omit<MediaElement, "id" | "x" | "y" | "locked" | "groupId">,
	) => void;
	createTextElement: (element: Omit<TextElement, "id">) => void;
	createWebPageElement: (element: Omit<WebPageElement, "id">) => void;
	createQrCodeElement: (element: Omit<QrCodeElement, "id">) => void;
	createClockElement: (element: Omit<ClockElement, "id">) => void;
	createShapeElement: (element: Omit<ShapeElement, "id">) => void;
	createMediaElement: (element: Omit<MediaElement, "id">) => void;
	updateTextElement: (id: string, updates: Partial<TextElement>) => void;
	updateWebPageElement: (id: string, updates: Partial<WebPageElement>) => void;
	updateQrCodeElement: (id: string, updates: Partial<QrCodeElement>) => void;
	updateClockElement: (id: string, updates: Partial<ClockElement>) => void;
	updateShapeElement: (id: string, updates: Partial<ShapeElement>) => void;
	updateMediaElement: (id: string, updates: Partial<MediaElement>) => void;
	updateWidget: (id: string, patch: Partial<WidgetProps>) => void;
	removeTextElement: (id: string) => void;
	removeWebPageElement: (id: string) => void;
	removeQrCodeElement: (id: string) => void;
	removeClockElement: (id: string) => void;
	removeShapeElement: (id: string) => void;
	removeMediaElement: (id: string) => void;
	selectTextElement: (id: string | null) => void;
	selectWebPageElement: (id: string | null) => void;
	selectQrCodeElement: (id: string | null) => void;
	selectClockElement: (id: string | null) => void;
	selectShapeElement: (id: string | null) => void;
	selectMediaElement: (id: string | null) => void;
	setSelectedWidgetId: (id: string | null) => void;
};

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

const scaleFontSize = (size: number) => Math.round(size * FONT_SCALE_RATIO);

const DEFAULT_TEXT: Omit<TextElement, "id"> = {
	text: "文字段落",
	x: 0,
	y: DOC_DIMENSIONS.height / 2 - 20,
	fontSize: scaleFontSize(BASE_BODY_FONT),
	fontFamily: "Noto Sans TC",
	fontStyle: "normal",
	textDecoration: "",
	align: "left",
	fill: "#111827",
	backgroundColor: "transparent",
	animation: "static",
	locked: false,
	groupId: null,
};

const SHAPE_DEFAULT_SIZES: Record<ShapeType, { width: number; height: number }> = {
	rectangle: { width: 520, height: 320 },
	"rounded-rectangle": { width: 520, height: 320 },
	circle: { width: 360, height: 360 },
	triangle: { width: 360, height: 320 },
	"triangle-inverted": { width: 360, height: 320 },
	diamond: { width: 360, height: 360 },
	plus: { width: 360, height: 360 },
	pentagon: { width: 360, height: 360 },
	hexagon: { width: 420, height: 360 },
	trapezoid: { width: 420, height: 300 },
	parallelogram: { width: 420, height: 300 },
	"right-triangle": { width: 360, height: 320 },
};

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
	const [textElements, setTextElements] = useState<TextElement[]>([]);
	const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
	const [webPageElements, setWebPageElements] = useState<WebPageElement[]>([]);
	const [selectedWebPageId, setSelectedWebPageId] = useState<string | null>(null);
	const [qrCodeElements, setQrCodeElements] = useState<QrCodeElement[]>([]);
	const [selectedQrCodeId, setSelectedQrCodeId] = useState<string | null>(null);
	const [clockElements, setClockElements] = useState<ClockElement[]>([]);
	const [selectedClockId, setSelectedClockId] = useState<string | null>(null);
	const [shapeElements, setShapeElements] = useState<ShapeElement[]>([]);
	const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
	const [mediaElements, setMediaElements] = useState<MediaElement[]>([]);
	const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

	const widgetsById = useMemo(() => {
		const entries: Array<[string, Widget]> = [];

		textElements.forEach((item) => {
			entries.push([
				item.id,
				{
					id: item.id,
					type: "text",
					x: item.x,
					y: item.y,
					width: item.width,
					props: {
						text: item.text,
						fontSize: item.fontSize,
						fontFamily: item.fontFamily,
						fontStyle: item.fontStyle,
						textDecoration: item.textDecoration,
						align: item.align,
						fill: item.fill,
						backgroundColor: item.backgroundColor,
						animation: item.animation,
					},
				},
			]);
		});

		webPageElements.forEach((item) => {
			entries.push([
				item.id,
				{
					id: item.id,
					type: "webPage",
					x: item.x,
					y: item.y,
					width: item.width,
					height: item.height,
					props: { url: item.url },
				},
			]);
		});

		qrCodeElements.forEach((item) => {
			entries.push([
				item.id,
				{
					id: item.id,
					type: "qrCode",
					x: item.x,
					y: item.y,
					width: item.size,
					height: item.size,
					props: { text: item.text, size: item.size },
				},
			]);
		});

		clockElements.forEach((item) => {
			entries.push([
				item.id,
				{
					id: item.id,
					type: "clock",
					x: item.x,
					y: item.y,
					width: item.width,
					height: item.height,
					props: {
						displayFormat: item.displayFormat,
						timeFormat: item.timeFormat,
						fontSize: item.fontSize,
						textColor: item.textColor,
						backgroundColor: item.backgroundColor,
					},
				},
			]);
		});

		shapeElements.forEach((item) => {
			entries.push([
				item.id,
				{
					id: item.id,
					type: "shape",
					x: item.x,
					y: item.y,
					width: item.width,
					height: item.height,
					props: { type: item.type, fill: item.fill },
				},
			]);
		});

		mediaElements.forEach((item) => {
			entries.push([
				item.id,
				{
					id: item.id,
					type: "media",
					x: item.x,
					y: item.y,
					width: item.width,
					height: item.height,
					props: { kind: item.kind, name: item.name, src: item.src },
				},
			]);
		});

		return Object.fromEntries(entries);
	}, [clockElements, mediaElements, qrCodeElements, shapeElements, textElements, webPageElements]);

	const selectedWidgetId = useMemo(() => {
		if (selectedTextId) return selectedTextId;
		if (selectedWebPageId) return selectedWebPageId;
		if (selectedQrCodeId) return selectedQrCodeId;
		if (selectedClockId) return selectedClockId;
		if (selectedShapeId) return selectedShapeId;
		if (selectedMediaId) return selectedMediaId;
		return null;
	}, [
		selectedClockId,
		selectedMediaId,
		selectedQrCodeId,
		selectedShapeId,
		selectedTextId,
		selectedWebPageId,
	]);

	const addTextElement = useCallback(() => {
		const id = crypto.randomUUID();
		setTextElements((prev) => [...prev, { ...DEFAULT_TEXT, id }]);
		setSelectedTextId(id);
	}, []);

	const addHeadingElement = useCallback(() => {
		const id = crypto.randomUUID();
		setTextElements((prev) => [
			...prev,
			{
				...DEFAULT_TEXT,
				id,
				text: "標題文字",
				fontSize: scaleFontSize(BASE_HEADING_FONT),
				fontStyle: "bold",
			},
		]);
		setSelectedTextId(id);
	}, []);

	const addWebPageElement = useCallback((url: string) => {
		const id = crypto.randomUUID();
		const width = 1600;
		const height = 900;
		setWebPageElements((prev) => [
			...prev,
			{
				id,
				url,
				x: (DOC_DIMENSIONS.width - width) / 2,
				y: (DOC_DIMENSIONS.height - height) / 2,
				width,
				height,
				locked: false,
				groupId: null,
			},
		]);
		setSelectedWebPageId(id);
		setSelectedTextId(null);
		setSelectedQrCodeId(null);
		setSelectedClockId(null);
		setSelectedMediaId(null);
	}, []);

	const addQrCodeElement = useCallback((text: string) => {
		const id = crypto.randomUUID();
		const size = 480;
		setQrCodeElements((prev) => [
			...prev,
			{
				id,
				text,
				x: (DOC_DIMENSIONS.width - size) / 2,
				y: (DOC_DIMENSIONS.height - size) / 2,
				size,
				locked: false,
				groupId: null,
			},
		]);
		setSelectedQrCodeId(id);
		setSelectedTextId(null);
		setSelectedWebPageId(null);
		setSelectedShapeId(null);
		setSelectedClockId(null);
		setSelectedMediaId(null);
	}, []);

	const addClockElement = useCallback(
		(
			element: Pick<
				ClockElement,
				"displayFormat" | "timeFormat" | "fontSize" | "textColor" | "backgroundColor"
			>,
		) => {
			const id = crypto.randomUUID();
			const { width, height } = CLOCK_DEFAULT_SIZE;
			setClockElements((prev) => [
				...prev,
				{
					id,
					...element,
					x: (DOC_DIMENSIONS.width - width) / 2,
					y: (DOC_DIMENSIONS.height - height) / 2,
					width,
					height,
					locked: false,
					groupId: null,
				},
			]);
			setSelectedClockId(id);
			setSelectedTextId(null);
			setSelectedWebPageId(null);
			setSelectedQrCodeId(null);
			setSelectedShapeId(null);
			setSelectedMediaId(null);
		},
		[],
	);

	const addShapeElement = useCallback((type: ShapeType) => {
		const id = crypto.randomUUID();
		const { width, height } = SHAPE_DEFAULT_SIZES[type];
		setShapeElements((prev) => [
			...prev,
			{
				id,
				type,
				x: DOC_DIMENSIONS.width / 2,
				y: DOC_DIMENSIONS.height / 2,
				width,
				height,
				fill: "#000000",
				locked: false,
				groupId: null,
			},
		]);
		setSelectedShapeId(id);
		setSelectedTextId(null);
		setSelectedWebPageId(null);
		setSelectedQrCodeId(null);
		setSelectedClockId(null);
		setSelectedMediaId(null);
	}, []);

	const addMediaElement = useCallback(
		(media: Omit<MediaElement, "id" | "x" | "y" | "locked" | "groupId">) => {
			const id = crypto.randomUUID();
			setMediaElements((prev) => [
				...prev,
				{
					...media,
					id,
					x: (DOC_DIMENSIONS.width - media.width) / 2,
					y: (DOC_DIMENSIONS.height - media.height) / 2,
					locked: false,
					groupId: null,
				},
			]);
			setSelectedMediaId(id);
			setSelectedTextId(null);
			setSelectedWebPageId(null);
			setSelectedQrCodeId(null);
			setSelectedShapeId(null);
			setSelectedClockId(null);
		},
		[],
	);

	const createTextElement = useCallback((element: Omit<TextElement, "id">) => {
		const id = crypto.randomUUID();
		setTextElements((prev) => [
			...prev,
			{ ...element, groupId: element.groupId ?? null, id },
		]);
		setSelectedTextId(id);
		setSelectedWebPageId(null);
		setSelectedQrCodeId(null);
		setSelectedClockId(null);
		setSelectedShapeId(null);
		setSelectedMediaId(null);
	}, []);

	const createWebPageElement = useCallback(
		(element: Omit<WebPageElement, "id">) => {
			const id = crypto.randomUUID();
			setWebPageElements((prev) => [
				...prev,
				{ ...element, groupId: element.groupId ?? null, id },
			]);
			setSelectedWebPageId(id);
			setSelectedTextId(null);
			setSelectedQrCodeId(null);
			setSelectedClockId(null);
			setSelectedShapeId(null);
			setSelectedMediaId(null);
		},
		[],
	);

	const createQrCodeElement = useCallback(
		(element: Omit<QrCodeElement, "id">) => {
			const id = crypto.randomUUID();
			setQrCodeElements((prev) => [
				...prev,
				{ ...element, groupId: element.groupId ?? null, id },
			]);
			setSelectedQrCodeId(id);
			setSelectedTextId(null);
			setSelectedWebPageId(null);
			setSelectedClockId(null);
			setSelectedShapeId(null);
			setSelectedMediaId(null);
		},
		[],
	);

	const createClockElement = useCallback(
		(element: Omit<ClockElement, "id">) => {
			const id = crypto.randomUUID();
			setClockElements((prev) => [
				...prev,
				{ ...element, groupId: element.groupId ?? null, id },
			]);
			setSelectedClockId(id);
			setSelectedTextId(null);
			setSelectedWebPageId(null);
			setSelectedQrCodeId(null);
			setSelectedShapeId(null);
			setSelectedMediaId(null);
		},
		[],
	);

	const createShapeElement = useCallback(
		(element: Omit<ShapeElement, "id">) => {
			const id = crypto.randomUUID();
			setShapeElements((prev) => [
				...prev,
				{ ...element, groupId: element.groupId ?? null, id },
			]);
			setSelectedShapeId(id);
			setSelectedTextId(null);
			setSelectedWebPageId(null);
			setSelectedQrCodeId(null);
			setSelectedClockId(null);
			setSelectedMediaId(null);
		},
		[],
	);

	const createMediaElement = useCallback(
		(element: Omit<MediaElement, "id">) => {
			const id = crypto.randomUUID();
			setMediaElements((prev) => [
				...prev,
				{ ...element, groupId: element.groupId ?? null, id },
			]);
			setSelectedMediaId(id);
			setSelectedTextId(null);
			setSelectedWebPageId(null);
			setSelectedQrCodeId(null);
			setSelectedShapeId(null);
			setSelectedClockId(null);
		},
		[],
	);

	const updateTextElement = useCallback(
		(id: string, updates: Partial<TextElement>) => {
			setTextElements((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
			);
		},
		[],
	);

	const updateWebPageElement = useCallback(
		(id: string, updates: Partial<WebPageElement>) => {
			setWebPageElements((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
			);
		},
		[],
	);

	const updateQrCodeElement = useCallback(
		(id: string, updates: Partial<QrCodeElement>) => {
			setQrCodeElements((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
			);
		},
		[],
	);

	const updateClockElement = useCallback(
		(id: string, updates: Partial<ClockElement>) => {
			setClockElements((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
			);
		},
		[],
	);

	const updateShapeElement = useCallback(
		(id: string, updates: Partial<ShapeElement>) => {
			setShapeElements((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
			);
		},
		[],
	);

	const updateMediaElement = useCallback(
		(id: string, updates: Partial<MediaElement>) => {
			setMediaElements((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
			);
		},
		[],
	);

	const updateWidget = useCallback(
		(id: string, patch: Partial<WidgetProps>) => {
			const widget = widgetsById[id];
			if (!widget) return;

			switch (widget.type) {
				case "text":
					updateTextElement(id, patch as Partial<TextElement>);
					break;
				case "webPage":
					updateWebPageElement(id, patch as Partial<WebPageElement>);
					break;
				case "qrCode":
					updateQrCodeElement(id, patch as Partial<QrCodeElement>);
					break;
				case "clock":
					updateClockElement(id, patch as Partial<ClockElement>);
					break;
				case "shape":
					updateShapeElement(id, patch as Partial<ShapeElement>);
					break;
				case "media":
					updateMediaElement(id, patch as Partial<MediaElement>);
					break;
				default:
					break;
			}
		},
		[
			updateClockElement,
			updateMediaElement,
			updateQrCodeElement,
			updateShapeElement,
			updateTextElement,
			updateWebPageElement,
			widgetsById,
		],
	);

	const removeTextElement = useCallback((id: string) => {
		setTextElements((prev) => prev.filter((item) => item.id !== id));
		setSelectedTextId((prev) => (prev === id ? null : prev));
	}, []);

	const removeWebPageElement = useCallback((id: string) => {
		setWebPageElements((prev) => prev.filter((item) => item.id !== id));
		setSelectedWebPageId((prev) => (prev === id ? null : prev));
	}, []);

	const removeQrCodeElement = useCallback((id: string) => {
		setQrCodeElements((prev) => prev.filter((item) => item.id !== id));
		setSelectedQrCodeId((prev) => (prev === id ? null : prev));
	}, []);

	const removeClockElement = useCallback((id: string) => {
		setClockElements((prev) => prev.filter((item) => item.id !== id));
		setSelectedClockId((prev) => (prev === id ? null : prev));
	}, []);

	const removeShapeElement = useCallback((id: string) => {
		setShapeElements((prev) => prev.filter((item) => item.id !== id));
		setSelectedShapeId((prev) => (prev === id ? null : prev));
	}, []);

	const removeMediaElement = useCallback((id: string) => {
		setMediaElements((prev) => prev.filter((item) => item.id !== id));
		setSelectedMediaId((prev) => (prev === id ? null : prev));
	}, []);

	const selectTextElement = useCallback((id: string | null) => {
		setSelectedTextId(id);
	}, []);

	const selectWebPageElement = useCallback((id: string | null) => {
		setSelectedWebPageId(id);
	}, []);

	const selectQrCodeElement = useCallback((id: string | null) => {
		setSelectedQrCodeId(id);
	}, []);

	const selectClockElement = useCallback((id: string | null) => {
		setSelectedClockId(id);
	}, []);

	const selectShapeElement = useCallback((id: string | null) => {
		setSelectedShapeId(id);
	}, []);

	const selectMediaElement = useCallback((id: string | null) => {
		setSelectedMediaId(id);
	}, []);

	const setSelectedWidgetId = useCallback(
		(id: string | null) => {
			if (!id) {
				setSelectedTextId(null);
				setSelectedWebPageId(null);
				setSelectedQrCodeId(null);
				setSelectedClockId(null);
				setSelectedShapeId(null);
				setSelectedMediaId(null);
				return;
			}

			const widget = widgetsById[id];
			if (!widget) {
				setSelectedTextId(null);
				setSelectedWebPageId(null);
				setSelectedQrCodeId(null);
				setSelectedClockId(null);
				setSelectedShapeId(null);
				setSelectedMediaId(null);
				return;
			}

			setSelectedTextId(widget.type === "text" ? id : null);
			setSelectedWebPageId(widget.type === "webPage" ? id : null);
			setSelectedQrCodeId(widget.type === "qrCode" ? id : null);
			setSelectedClockId(widget.type === "clock" ? id : null);
			setSelectedShapeId(widget.type === "shape" ? id : null);
			setSelectedMediaId(widget.type === "media" ? id : null);
		},
		[widgetsById],
	);

	const value = useMemo(
		() => ({
			textElements,
			selectedTextId,
			webPageElements,
			selectedWebPageId,
			qrCodeElements,
			selectedQrCodeId,
			clockElements,
			selectedClockId,
			shapeElements,
			selectedShapeId,
			mediaElements,
			selectedMediaId,
			selectedWidgetId,
			widgetsById,
			addTextElement,
			addHeadingElement,
			addWebPageElement,
			addQrCodeElement,
			addClockElement,
			addShapeElement,
			addMediaElement,
			createTextElement,
			createWebPageElement,
			createQrCodeElement,
			createClockElement,
			createShapeElement,
			createMediaElement,
			updateTextElement,
			updateWebPageElement,
			updateQrCodeElement,
			updateClockElement,
			updateShapeElement,
			updateMediaElement,
			updateWidget,
			removeTextElement,
			removeWebPageElement,
			removeQrCodeElement,
			removeClockElement,
			removeShapeElement,
			removeMediaElement,
			selectTextElement,
			selectWebPageElement,
			selectQrCodeElement,
			selectClockElement,
			selectShapeElement,
			selectMediaElement,
			setSelectedWidgetId,
		}),
		[
			textElements,
			selectedTextId,
			webPageElements,
			selectedWebPageId,
			qrCodeElements,
			selectedQrCodeId,
			clockElements,
			selectedClockId,
			shapeElements,
			selectedShapeId,
			mediaElements,
			selectedMediaId,
			selectedWidgetId,
			widgetsById,
			addTextElement,
			addHeadingElement,
			addWebPageElement,
			addQrCodeElement,
			addClockElement,
			addShapeElement,
			addMediaElement,
			createTextElement,
			createWebPageElement,
			createQrCodeElement,
			createClockElement,
			createShapeElement,
			createMediaElement,
			updateTextElement,
			updateWebPageElement,
			updateQrCodeElement,
			updateClockElement,
			updateShapeElement,
			updateMediaElement,
			updateWidget,
			removeTextElement,
			removeWebPageElement,
			removeQrCodeElement,
			removeClockElement,
			removeShapeElement,
			removeMediaElement,
			selectTextElement,
			selectWebPageElement,
			selectQrCodeElement,
			selectClockElement,
			selectShapeElement,
			selectMediaElement,
			setSelectedWidgetId,
		],
	);

	return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};

export const useEditorContext = () => {
	const context = useContext(EditorContext);
	if (!context) {
		throw new Error("useEditorContext must be used within EditorProvider");
	}
	return context;
};
