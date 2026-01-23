import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const DOC_DIMENSIONS = { width: 3840, height: 2160 };
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

export type EditorContextValue = {
	textElements: TextElement[];
	selectedTextId: string | null;
	webPageElements: WebPageElement[];
	selectedWebPageId: string | null;
	qrCodeElements: QrCodeElement[];
	selectedQrCodeId: string | null;
	shapeElements: ShapeElement[];
	selectedShapeId: string | null;
	mediaElements: MediaElement[];
	selectedMediaId: string | null;
	addTextElement: () => void;
	addHeadingElement: () => void;
	addWebPageElement: (url: string) => void;
	addQrCodeElement: (text: string) => void;
	addShapeElement: (type: ShapeType) => void;
	addMediaElement: (
		media: Omit<MediaElement, "id" | "x" | "y" | "locked" | "groupId">,
	) => void;
	createTextElement: (element: Omit<TextElement, "id">) => void;
	createWebPageElement: (element: Omit<WebPageElement, "id">) => void;
	createQrCodeElement: (element: Omit<QrCodeElement, "id">) => void;
	createShapeElement: (element: Omit<ShapeElement, "id">) => void;
	createMediaElement: (element: Omit<MediaElement, "id">) => void;
	updateTextElement: (id: string, updates: Partial<TextElement>) => void;
	updateWebPageElement: (id: string, updates: Partial<WebPageElement>) => void;
	updateQrCodeElement: (id: string, updates: Partial<QrCodeElement>) => void;
	updateShapeElement: (id: string, updates: Partial<ShapeElement>) => void;
	updateMediaElement: (id: string, updates: Partial<MediaElement>) => void;
	removeTextElement: (id: string) => void;
	removeWebPageElement: (id: string) => void;
	removeQrCodeElement: (id: string) => void;
	removeShapeElement: (id: string) => void;
	removeMediaElement: (id: string) => void;
	selectTextElement: (id: string | null) => void;
	selectWebPageElement: (id: string | null) => void;
	selectQrCodeElement: (id: string | null) => void;
	selectShapeElement: (id: string | null) => void;
	selectMediaElement: (id: string | null) => void;
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
	const [shapeElements, setShapeElements] = useState<ShapeElement[]>([]);
	const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
	const [mediaElements, setMediaElements] = useState<MediaElement[]>([]);
	const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);

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
		setSelectedMediaId(null);
	}, []);

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

	const selectShapeElement = useCallback((id: string | null) => {
		setSelectedShapeId(id);
	}, []);

	const selectMediaElement = useCallback((id: string | null) => {
		setSelectedMediaId(id);
	}, []);

	const value = useMemo(
		() => ({
			textElements,
			selectedTextId,
			webPageElements,
			selectedWebPageId,
			qrCodeElements,
			selectedQrCodeId,
			shapeElements,
			selectedShapeId,
			mediaElements,
			selectedMediaId,
			addTextElement,
			addHeadingElement,
			addWebPageElement,
			addQrCodeElement,
			addShapeElement,
			addMediaElement,
			createTextElement,
			createWebPageElement,
			createQrCodeElement,
			createShapeElement,
			createMediaElement,
			updateTextElement,
			updateWebPageElement,
			updateQrCodeElement,
			updateShapeElement,
			updateMediaElement,
			removeTextElement,
			removeWebPageElement,
			removeQrCodeElement,
			removeShapeElement,
			removeMediaElement,
			selectTextElement,
			selectWebPageElement,
			selectQrCodeElement,
			selectShapeElement,
			selectMediaElement,
		}),
		[
			textElements,
			selectedTextId,
			webPageElements,
			selectedWebPageId,
			qrCodeElements,
			selectedQrCodeId,
			shapeElements,
			selectedShapeId,
			mediaElements,
			selectedMediaId,
			addTextElement,
			addHeadingElement,
			addWebPageElement,
			addQrCodeElement,
			addShapeElement,
			addMediaElement,
			createTextElement,
			createWebPageElement,
			createQrCodeElement,
			createShapeElement,
			createMediaElement,
			updateTextElement,
			updateWebPageElement,
			updateQrCodeElement,
			updateShapeElement,
			updateMediaElement,
			removeTextElement,
			removeWebPageElement,
			removeQrCodeElement,
			removeShapeElement,
			removeMediaElement,
			selectTextElement,
			selectWebPageElement,
			selectQrCodeElement,
			selectShapeElement,
			selectMediaElement,
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
