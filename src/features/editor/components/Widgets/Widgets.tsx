import Clock from "./components/Clock";
import Media from "./components/Media";
import QrCode from "./components/QrCode";
import Shape from "./components/Shape";
import Text from "./components/Text";
import Weather from "./components/Weather";
import WebPage from "./components/WebPage";

const Widgets = () => {
	return (
		<aside className="w-[4.5rem] h-full bg-zinc-300 [grid-area:widgets]">
			<div className="flex h-full flex-col items-center gap-2 p-2">
				<Media />
				<Text />
				<WebPage />
				<Weather />
				<Clock />
				<QrCode />
				<Shape />
			</div>
		</aside>
	);
};

export default Widgets;
