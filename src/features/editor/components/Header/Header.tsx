import LanguageSelector from "./components/LanguageSelector";

const Header = () => {
	return (
		<header className="flex justify-between items-center bg-slate-500 text-white p-4 w-full h-14 [grid-area:header]">
			Header
			<LanguageSelector />
		</header>
	);
};

export default Header;
