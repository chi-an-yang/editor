import { useEditorContext } from "@features/editor/context/EditorContext";
import { buildNovoDsXml } from "@features/editor/utils/novoDsXml";
import LanguageSelector from "./components/LanguageSelector";

const Header = () => {
	const {
		textElements,
		webPageElements,
		youTubeElements,
		qrCodeElements,
		weatherElements,
		clockElements,
		shapeElements,
		mediaElements,
	} = useEditorContext();

	const handleSave = () => {
		const xml = buildNovoDsXml({
			textElements,
			webPageElements,
			youTubeElements,
			qrCodeElements,
			weatherElements,
			clockElements,
			shapeElements,
			mediaElements,
		});
		console.log(xml);
	};

	return (
		<header className="flex justify-between items-center bg-slate-500 text-white p-4 w-full h-14 [grid-area:header]">
			<div className="flex items-center gap-3">
				<span className="text-sm font-semibold">Header</span>
				<button
					type="button"
					className="rounded bg-white/10 px-3 py-1 text-sm font-medium text-white transition hover:bg-white/20"
					onClick={handleSave}
				>
					SAVE
				</button>
			</div>
			<LanguageSelector />
		</header>
	);
};

export default Header;
