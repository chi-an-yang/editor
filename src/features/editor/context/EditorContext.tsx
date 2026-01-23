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
};

export type WebPageElement = {
	id: string;
	url: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type QrCodeElement = {
	id: string;
	text: string;
	x: number;
	y: number;
	size: number;
};

export type ShapeType = "rectangle" | "circle" | "triangle";

export type ShapeElement = {
	id: string;
	type: ShapeType;
	x: number;
	y: number;
	width: number;
	height: number;
	fill: string;
};

type EditorContextValue = {
	textElements: TextElement[];
	selectedTextId: string | null;
	webPageElements: WebPageElement[];
	selectedWebPageId: string | null;
	qrCodeElements: QrCodeElement[];
	selectedQrCodeId: string | null;
	shapeElements: ShapeElement[];
	selectedShapeId: string | null;
	addTextElement: () => void;
	addHeadingElement: () => void;
	addWebPageElement: (url: string) => void;
	addQrCodeElement: (text: string) => void;
	addShapeElement: (type: ShapeType) => void;
	updateTextElement: (id: string, updates: Partial<TextElement>) => void;
	updateWebPageElement: (id: string, updates: Partial<WebPageElement>) => void;
	updateQrCodeElement: (id: string, updates: Partial<QrCodeElement>) => void;
	updateShapeElement: (id: string, updates: Partial<ShapeElement>) => void;
	selectTextElement: (id: string | null) => void;
	selectWebPageElement: (id: string | null) => void;
	selectQrCodeElement: (id: string | null) => void;
	selectShapeElement: (id: string | null) => void;
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
			},
		]);
		setSelectedWebPageId(id);
		setSelectedTextId(null);
		setSelectedQrCodeId(null);
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
			},
		]);
		setSelectedQrCodeId(id);
		setSelectedTextId(null);
		setSelectedWebPageId(null);
		setSelectedShapeId(null);
	}, []);

	const addShapeElement = useCallback((type: ShapeType) => {
		const id = crypto.randomUUID();
		const width = type === "rectangle" ? 520 : 360;
		const height = type === "rectangle" ? 320 : 360;
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
			},
		]);
		setSelectedShapeId(id);
		setSelectedTextId(null);
		setSelectedWebPageId(null);
		setSelectedQrCodeId(null);
	}, []);

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
			addTextElement,
			addHeadingElement,
			addWebPageElement,
			addQrCodeElement,
			addShapeElement,
			updateTextElement,
			updateWebPageElement,
			updateQrCodeElement,
			updateShapeElement,
			selectTextElement,
			selectWebPageElement,
			selectQrCodeElement,
			selectShapeElement,
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
			addTextElement,
			addHeadingElement,
			addWebPageElement,
			addQrCodeElement,
			addShapeElement,
			updateTextElement,
			updateWebPageElement,
			updateQrCodeElement,
			updateShapeElement,
			selectTextElement,
			selectWebPageElement,
			selectQrCodeElement,
			selectShapeElement,
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
