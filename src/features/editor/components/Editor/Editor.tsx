import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Image as KonvaImage,
	Layer,
	Label,
	Line,
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
	MediaElement,
	QrCodeElement,
	ShapeElement,
	TextElement,
	WebPageElement,
} from "@features/editor/context/EditorContext";
import { DOC_DIMENSIONS, useEditorContext } from "@features/editor/context/EditorContext";

const PADDING = 32;
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
const MIN_TEXT_WIDTH = 120;
const MIN_TEXT_SIZE = 1;
const MAX_TEXT_SIZE = 1024;
const MIN_QR_SIZE = 120;
const MIN_SHAPE_SIZE = 40;
const MIN_MEDIA_WIDTH = 160;
const MIN_MEDIA_HEIGHT = 120;
const TOOLBAR_OFFSET = 16;
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
	| { type: "qrCode"; data: Omit<QrCodeElement, "id"> }
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
	| { type: "qrCode"; id: string }
	| { type: "shape"; id: string }
	| { type: "media"; id: string };

type SelectedElement =
	| { type: "text"; element: TextElement }
	| { type: "webPage"; element: WebPageElement }
	| { type: "qrCode"; element: QrCodeElement }
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
	const containerRef = useRef<HTMLDivElement | null>(null);
	const stageRef = useRef<Konva.Stage | null>(null);
	const pageLayerRef = useRef<Konva.Layer | null>(null);
	const pageRef = useRef<Konva.Rect | null>(null);
	const transformerRef = useRef<Konva.Transformer | null>(null);
	const webPageTransformerRef = useRef<Konva.Transformer | null>(null);
	const qrCodeTransformerRef = useRef<Konva.Transformer | null>(null);
	const shapeTransformerRef = useRef<Konva.Transformer | null>(null);
	const mediaTransformerRef = useRef<Konva.Transformer | null>(null);
	const textLabelRefs = useRef<Record<string, Konva.Label | null>>({});
	const textNodeRefs = useRef<Record<string, Konva.Text | null>>({});
	const webPageNodeRefs = useRef<Record<string, Konva.Rect | null>>({});
	const qrCodeNodeRefs = useRef<Record<string, Konva.Image | null>>({});
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
		qrCodeElements,
		selectedQrCodeId,
		shapeElements,
		selectedShapeId,
		mediaElements,
		selectedMediaId,
		selectTextElement,
		selectWebPageElement,
		selectQrCodeElement,
		selectShapeElement,
		selectMediaElement,
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
	} = useEditorContext();

	// viewport = Editor 可視區大小（不等於 DOC）
	const [viewport, setViewport] = useState({ width: 1, height: 1 });

	// scale = 顯示比例（1 = 100% = 3840x2160）
	const [scale, setScale] = useState(0.2);

	// pos = Page 在 viewport 內的位置（平移）
	const [pos, setPos] = useState({ x: 0, y: 0 });

	// mode = 是否維持 Fit 模式（容器 resize 時會重算 fit）
	const [mode, setMode] = useState<"fit" | "custom">("fit");
	const [clipboard, setClipboard] = useState<ClipboardItem | null>(null);
	const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
	const [selectionBounds, setSelectionBounds] = useState<SelectionBounds | null>(
		null,
	);
	const [guideLines, setGuideLines] = useState<GuideLine[]>([]);
	const [toolbarPosition, setToolbarPosition] = useState({
		left: 0,
		top: TOOLBAR_OFFSET,
	});
	const [scrollOffset, setScrollOffset] = useState({ x: 0, y: 0 });

	const viewportCenter = useMemo(
		() => ({ x: viewport.width / 2, y: viewport.height / 2 }),
		[viewport.height, viewport.width],
	);
	const textToolbarCenterX = useMemo(
		() => pos.x + (DOC_DIMENSIONS.width * scale) / 2,
		[pos.x, scale],
	);

	const calcFit = useCallback((vw: number, vh: number) => {
		const s = Math.min(
			(vw - PADDING * 2) / DOC_DIMENSIONS.width,
			(vh - PADDING * 2) / DOC_DIMENSIONS.height,
		);
		return clamp(s, MIN_SCALE, MAX_SCALE);
	}, []);

	const centerPage = useCallback((vw: number, vh: number, s: number) => {
		setPos({
			x: (vw - DOC_DIMENSIONS.width * s) / 2,
			y: (vh - DOC_DIMENSIONS.height * s) / 2,
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

	const updateToolbarPosition = useCallback(() => {
		const c = containerRef.current;
		if (!c) return;
		const rect = c.getBoundingClientRect();
		setToolbarPosition({
			left: rect.left + rect.width / 2,
			top: rect.top + TOOLBAR_OFFSET,
		});
	}, []);

	// Resize：若還在 fit 模式就重算；否則只更新 viewport
	useEffect(() => {
		const c = containerRef.current;
		if (!c) return;

		const update = () => {
			const vw = Math.max(1, Math.floor(c.clientWidth));
			const vh = Math.max(1, Math.floor(c.clientHeight));
			setViewport({ width: vw, height: vh });
			updateToolbarPosition();

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
	}, [calcFit, centerPage, mode, updateToolbarPosition]);

	useEffect(() => {
		updateToolbarPosition();
		window.addEventListener("scroll", updateToolbarPosition, { passive: true });
		return () => {
			window.removeEventListener("scroll", updateToolbarPosition);
		};
	}, [updateToolbarPosition]);

	useEffect(() => {
		const scroller = containerRef.current;
		if (!scroller) return;

		const updateScrollOffset = () => {
			setScrollOffset({ x: scroller.scrollLeft, y: scroller.scrollTop });
		};

		updateScrollOffset();
		scroller.addEventListener("scroll", updateScrollOffset, { passive: true });
		return () => {
			scroller.removeEventListener("scroll", updateScrollOffset);
		};
	}, []);

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

	const getSelectionFromContext = useCallback((): SelectedItem | null => {
		if (selectedTextId) return { type: "text", id: selectedTextId };
		if (selectedWebPageId) return { type: "webPage", id: selectedWebPageId };
		if (selectedQrCodeId) return { type: "qrCode", id: selectedQrCodeId };
		if (selectedShapeId) return { type: "shape", id: selectedShapeId };
		if (selectedMediaId) return { type: "media", id: selectedMediaId };
		return null;
	}, [
		selectedMediaId,
		selectedQrCodeId,
		selectedShapeId,
		selectedTextId,
		selectedWebPageId,
	]);

	const applyContextSelection = useCallback(
		(selection: SelectedItem | null) => {
			selectTextElement(selection?.type === "text" ? selection.id : null);
			selectWebPageElement(selection?.type === "webPage" ? selection.id : null);
			selectQrCodeElement(selection?.type === "qrCode" ? selection.id : null);
			selectShapeElement(selection?.type === "shape" ? selection.id : null);
			selectMediaElement(selection?.type === "media" ? selection.id : null);
		},
		[
			selectMediaElement,
			selectQrCodeElement,
			selectShapeElement,
			selectTextElement,
			selectWebPageElement,
		],
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
			qrCodeElements.forEach((item) => {
				if (item.groupId === groupId) {
					items.push({ type: "qrCode", id: item.id });
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
			mediaElements,
			qrCodeElements,
			shapeElements,
			textElements,
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
		qrCodeElements.forEach((item) =>
			items.push({ type: "qrCode", id: item.id }),
		);
		shapeElements.forEach((item) =>
			items.push({ type: "shape", id: item.id }),
		);
		mediaElements.forEach((item) =>
			items.push({ type: "media", id: item.id }),
		);
		return items;
	}, [
		mediaElements,
		qrCodeElements,
		shapeElements,
		textElements,
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
	const selectedQrCode = useMemo(
		() => qrCodeElements.find((item) => item.id === selectedQrCodeId) ?? null,
		[selectedQrCodeId, qrCodeElements],
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
				case "qrCode": {
					const element =
						qrCodeElements.find((item) => item.id === selection.id) ?? null;
					return element ? { type: "qrCode", element } : null;
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
		[mediaElements, qrCodeElements, shapeElements, textElements, webPageElements],
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
				case "qrCode":
					updateQrCodeElement(item.element.id, { locked: nextLocked });
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
		updateMediaElement,
		updateQrCodeElement,
		updateShapeElement,
		updateTextElement,
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
				case "qrCode":
					createQrCodeElement({
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
			createMediaElement,
			createQrCodeElement,
			createShapeElement,
			createTextElement,
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
			case "qrCode": {
				const { id, groupId, ...data } = activeSelectedElement.element;
				return { type: "qrCode", data: { ...data, groupId: null } } as const;
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
		createMediaElement,
		createQrCodeElement,
		createShapeElement,
		createTextElement,
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
				case "qrCode":
					removeQrCodeElement(item.element.id);
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
		removeMediaElement,
		removeQrCodeElement,
		removeShapeElement,
		removeTextElement,
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
			qrCodeElements.forEach((item) => {
				if (item.groupId === groupId && item.id !== skipId) {
					updateQrCodeElement(item.id, {
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
			mediaElements,
			qrCodeElements,
			shapeElements,
			textElements,
			updateMediaElement,
			updateQrCodeElement,
			updateShapeElement,
			updateTextElement,
			updateWebPageElement,
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
				case "qrCode":
					updateQrCodeElement(item.element.id, { groupId });
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
		updateMediaElement,
		updateQrCodeElement,
		updateShapeElement,
		updateTextElement,
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
			qrCodeElements.forEach((item) => {
				if (item.groupId === groupId) {
					updateQrCodeElement(item.id, { groupId: null });
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
		mediaElements,
		qrCodeElements,
		shapeElements,
		selectedElements,
		textElements,
		updateMediaElement,
		updateQrCodeElement,
		updateShapeElement,
		updateTextElement,
		updateWebPageElement,
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
				case "qrCode": {
					const node = qrCodeNodeRefs.current[selection.id];
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
		selectedMedia,
		selectedQrCode,
		selectedShape,
		selectedItems,
		selectedText,
		selectedWebPage,
		scale,
		pos,
	]);

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
		Object.values(qrCodeNodeRefs.current).forEach((node) => {
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
			const toPageX = (value: number) => (value - pos.x) / scale;
			const toPageY = (value: number) => (value - pos.y) / scale;
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
		[pos.x, pos.y, scale],
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

	return (
		<main className="flex h-full w-full min-h-0 min-w-0 flex-col overflow-hidden bg-slate-50 [grid-area:editor]">
			<section className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
				<div className="relative flex h-full w-full min-h-0 min-w-0 overflow-hidden">
					<div className="pointer-events-none absolute inset-0 z-20">
						{selectedText ? (
							<div className="pointer-events-auto absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
								<div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
									<button
										type="button"
										className={`rounded px-2 py-1 font-semibold ${
											selectedText.fontStyle.includes("bold")
												? "bg-slate-900 text-white"
												: "text-slate-600 hover:bg-slate-200"
										}`}
										onClick={() => toggleFontStyle("bold")}
									>
										B
									</button>
									<button
										type="button"
										className={`rounded px-2 py-1 italic ${
											selectedText.fontStyle.includes("italic")
												? "bg-slate-900 text-white"
												: "text-slate-600 hover:bg-slate-200"
										}`}
										onClick={() => toggleFontStyle("italic")}
									>
										I
									</button>
									<button
										type="button"
										className={`rounded px-2 py-1 underline ${
											selectedText.textDecoration
												? "bg-slate-900 text-white"
												: "text-slate-600 hover:bg-slate-200"
										}`}
										onClick={toggleDecoration}
									>
										U
									</button>
									<div className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
										{(["left", "center", "right"] as const).map((align) => (
											<button
												key={align}
												type="button"
												className={`rounded px-2 py-1 text-xs font-semibold ${
													selectedText.align === align
														? "bg-slate-900 text-white"
														: "text-slate-600 hover:bg-slate-200"
												}`}
												onClick={() =>
													updateTextElement(selectedText.id, { align })
												}
											>
												{align === "left"
													? "L"
													: align === "center"
														? "C"
														: "R"}
											</button>
										))}
									</div>
								</div>
							</div>
						) : null}
						{selectionBounds && activeSelectedElement ? (
							<div
								className="pointer-events-auto absolute flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-md"
								style={{
									left:
										selectionBounds.x +
										selectionBounds.width / 2 -
										scrollOffset.x,
									top: selectionBounds.y - 16 - scrollOffset.y,
									transform: "translate(-50%, -100%)",
								}}
							>
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
						) : null}
					</div>
					{/* workspace：灰底，不要用虛線框 */}
					<div
						ref={containerRef}
						className="canvasScroller h-full w-full overflow-auto bg-slate-100"
					>
						<Stage
							ref={stageRef}
							width={viewport.width}
							height={viewport.height}
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
							x={pos.x}
							y={pos.y}
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
								boundBoxFunc={(_, newBox) => {
									const minWidth = MIN_TEXT_WIDTH;
									const minHeight = MIN_TEXT_SIZE * 1.5;
									if (newBox.width < minWidth || newBox.height < minHeight) {
										return {
											...newBox,
											width: Math.max(newBox.width, minWidth),
											height: Math.max(newBox.height, minHeight),
										};
									}
									return newBox;
								}}
							/>
							<Transformer
								ref={webPageTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(_, newBox) => {
									const minWidth = 200;
									const minHeight = 120;
									if (newBox.width < minWidth || newBox.height < minHeight) {
										return {
											...newBox,
											width: Math.max(newBox.width, minWidth),
											height: Math.max(newBox.height, minHeight),
										};
									}
									return newBox;
								}}
							/>
							<Transformer
								ref={qrCodeTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(_, newBox) => {
									if (newBox.width < MIN_QR_SIZE || newBox.height < MIN_QR_SIZE) {
										return {
											...newBox,
											width: Math.max(newBox.width, MIN_QR_SIZE),
											height: Math.max(newBox.height, MIN_QR_SIZE),
										};
									}
									return newBox;
								}}
							/>
							<Transformer
								ref={shapeTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(_, newBox) => {
									if (
										newBox.width < MIN_SHAPE_SIZE ||
										newBox.height < MIN_SHAPE_SIZE
									) {
										return {
											...newBox,
											width: Math.max(newBox.width, MIN_SHAPE_SIZE),
											height: Math.max(newBox.height, MIN_SHAPE_SIZE),
										};
									}
									return newBox;
								}}
							/>
							<Transformer
								ref={mediaTransformerRef}
								rotateEnabled={false}
								enabledAnchors={TRANSFORMER_ANCHORS}
								onTransformStart={handleTransformerTransformStart}
								boundBoxFunc={(_, newBox) => {
									if (
										newBox.width < MIN_MEDIA_WIDTH ||
										newBox.height < MIN_MEDIA_HEIGHT
									) {
										return {
											...newBox,
											width: Math.max(newBox.width, MIN_MEDIA_WIDTH),
											height: Math.max(newBox.height, MIN_MEDIA_HEIGHT),
										};
									}
									return newBox;
								}}
							/>
						</Layer>
						{guideLines.length ? (
							<Layer
								x={pos.x}
								y={pos.y}
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
