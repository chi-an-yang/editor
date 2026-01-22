import { useMemo, useState } from "react";
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
		description: "設定 QR Code 的內容與錯誤修正等級。",
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
	const { addTextElement } = useEditorContext();
	const activeWidget = useMemo(
		() => WIDGETS.find((widget) => widget.id === activeWidgetId) ?? null,
		[activeWidgetId],
	);

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
							<div className="flex items-center justify-between">
								<div>
									<p className="text-sm font-semibold text-slate-700">
										建立文字段落
									</p>
									<p className="mt-1 text-xs text-slate-500">
										新增可編輯文字，預設 16px 字體大小。
									</p>
								</div>
								<button
									type="button"
									onClick={addTextElement}
									className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
								>
									&lt;
								</button>
							</div>
						</div>
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
