import { createContext, useCallback, useContext, useMemo, useState } from "react";

export const DOC_DIMENSIONS = { width: 3840, height: 2160 };

export type TextElement = {
	id: string;
	text: string;
	x: number;
	y: number;
	width: number;
	fontSize: number;
	fontFamily: string;
	fontStyle: string;
	textDecoration: string;
	align: "left" | "center" | "right";
	fill: string;
};

type EditorContextValue = {
	textElements: TextElement[];
	selectedTextId: string | null;
	addTextElement: () => void;
	updateTextElement: (id: string, updates: Partial<TextElement>) => void;
	selectTextElement: (id: string | null) => void;
};

const EditorContext = createContext<EditorContextValue | undefined>(undefined);

const DEFAULT_TEXT: Omit<TextElement, "id"> = {
	text: "文字段落",
	x: DOC_DIMENSIONS.width / 2 - 160,
	y: DOC_DIMENSIONS.height / 2 - 20,
	width: 320,
	fontSize: 16,
	fontFamily: "Noto Sans TC",
	fontStyle: "normal",
	textDecoration: "",
	align: "left",
	fill: "#111827",
};

export const EditorProvider = ({ children }: { children: React.ReactNode }) => {
	const [textElements, setTextElements] = useState<TextElement[]>([]);
	const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

	const addTextElement = useCallback(() => {
		const id = crypto.randomUUID();
		setTextElements((prev) => [...prev, { ...DEFAULT_TEXT, id }]);
		setSelectedTextId(id);
	}, []);

	const updateTextElement = useCallback(
		(id: string, updates: Partial<TextElement>) => {
			setTextElements((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
			);
		},
		[],
	);

	const selectTextElement = useCallback((id: string | null) => {
		setSelectedTextId(id);
	}, []);

	const value = useMemo(
		() => ({
			textElements,
			selectedTextId,
			addTextElement,
			updateTextElement,
			selectTextElement,
		}),
		[textElements, selectedTextId, addTextElement, updateTextElement, selectTextElement],
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
