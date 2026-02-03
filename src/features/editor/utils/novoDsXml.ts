import type {
	ClockElement,
	MediaElement,
	QrCodeElement,
	ShapeElement,
	TextElement,
	WebPageElement,
	WeatherElement,
	YouTubeElement,
} from "@features/editor/context/EditorContext";
import { DOC_DIMENSIONS } from "@features/editor/context/EditorContext";

type NovoDsInput = {
	textElements: TextElement[];
	webPageElements: WebPageElement[];
	youTubeElements: YouTubeElement[];
	qrCodeElements: QrCodeElement[];
	weatherElements: WeatherElement[];
	clockElements: ClockElement[];
	shapeElements: ShapeElement[];
	mediaElements: MediaElement[];
};

const xmlEscape = (value: string) =>
	value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");

const buildSection = (
	index: number,
	attributes: Record<string, string | number>,
	content: string,
) => {
	const sectionAttributes = Object.entries({
		Z: 1,
		SectionValid: 1,
		Index: index,
		...attributes,
	})
		.map(([key, value]) => `${key}="${xmlEscape(String(value))}"`)
		.join(" ");
	return `<Section ${sectionAttributes}>${content}</Section>`;
};

const buildTextContent = (element: TextElement, liveId: string) => {
	const alignMap: Record<TextElement["align"], string> = {
		left: "Left-Top",
		center: "Center-Top",
		right: "Right-Top",
	};
	const backgroundColor =
		element.backgroundColor === "transparent"
			? "#00000000"
			: element.backgroundColor;
	return `<Content showType="Static" arg1="${alignMap[element.align]}" Text="${xmlEscape(
		element.text,
	)}" textColor="${xmlEscape(element.fill)}" backgroundColor="${xmlEscape(
		backgroundColor,
	)}" font="${xmlEscape(element.fontFamily)}" fontSize="${
		element.fontSize
	}" backgroundImage="" contentType="Text" Live_Update_type="0" Live_Update_path="" Live_Update_port="21" Live_Update_userName="" Live_Update_password="" Live_Update_Frequency="15" Live_Update_Access_Way="0" Live_Update_ID="${xmlEscape(
		liveId,
	)}" Live_Update_Show_Status="true" widgetType="null" isKioskMode="false"><AttachmentFiles/></Content>`;
};

const buildQrCodeContent = (element: QrCodeElement, liveId: string) => {
	return `<Content showType="QR Code" arg1="" Text="${xmlEscape(
		element.text,
	)}" textColor="#ff000000" backgroundColor="#00000000" font="Roboto-Light" fontSize="32" backgroundImage="" contentType="Text" Live_Update_type="0" Live_Update_path="" Live_Update_port="21" Live_Update_userName="" Live_Update_password="" Live_Update_Frequency="15" Live_Update_Access_Way="0" Live_Update_ID="${xmlEscape(
		liveId,
	)}" Live_Update_Show_Status="true" widgetType="null" isKioskMode="false" speed="Medium"><AttachmentFiles/></Content>`;
};

const buildWebPageContent = (element: WebPageElement, liveId: string) => {
	return `<Content displayMode="0" showType="Online" URL="${xmlEscape(
		element.url,
	)}" clearCache="0" autoRefresh="5400" isDesktopView="true" Enhanced_Rendering="true" Live_Update_ID="${xmlEscape(
		liveId,
	)}" showAfterLoadFinished="true" block_pop_ups="false" showBack="false" backPosition="Right-Top" fontScaleRatio="100" root="" doubleClickToFullScreen="false" resumeSignagePlaybackAfterIdle="-1" isKioskMode="false" widgetType="null"><AttachmentFiles/></Content>`;
};

const buildYouTubeContent = (element: YouTubeElement, liveId: string) => {
	const param =
		element.source === "playlist"
			? element.playlistUrl
			: element.videos.filter((video) => video.trim()).join(",");
	return `<Content param="${xmlEscape(
		param,
	)}" showType="Videos" Live_Update_ID="${xmlEscape(
		liveId,
	)}" showYouTubeControlBar="false" isKioskMode="false" widgetType="null"><AttachmentFiles/></Content>`;
};

const buildWeatherContent = (element: WeatherElement, liveId: string) => {
	const themeStyle =
		element.mainAreaStyle === "square" ? "Square" : "Rectangle(Horizontal)";
	const cityValue = `${element.city},  ${element.country || element.city}`;
	return `<Content Weather_Type="Location" textColor="${xmlEscape(
		element.textColor,
	)}" backgroundColor="${xmlEscape(
		element.backgroundColor,
	)}" theme_type="Contemporary" font="Roboto-Light" fontSize="28" Weather_Units_of_Temperature="Celsius" Weather_Lang="en-US" Weather_backgroundImage="" Weather_theme="Default" Weather_main_area_style="0" Weather_Forecast_Day="5" Weather_UpdateFrequency="30" Weather_Country="${xmlEscape(
		element.country,
	)}" theme_style="${themeStyle}" Weather_City="${xmlEscape(
		cityValue,
	)}" widgetType="Weather" isKioskMode="false" Live_Update_ID="${xmlEscape(
		liveId,
	)}" Weather_State=""><AttachmentFiles/></Content>`;
};

const buildClockContent = (element: ClockElement, liveId: string) => {
	const isAnalog = element.type === "analog";
	const extra = isAnalog
		? `Analog_Clock_Style="${
				element.theme === "dark" ? "black" : "white"
			}" alpha="255" display_name=""`
		: `Clock_Date_Format="yyyy.MM.dd EEEE" Clock_Show_Type="0" Clock_dos="0" Clock_dys="1" Clock_dms="1" Clock_dds="1" Clock_dws="0" Clock_dsep="1" Clock_Alignment_Vertical="1" Clock_Alignment_Horizontal="1"`;
	return `<Content Clock_Type="${xmlEscape(
		element.type,
	)}" Clock_Format="0" textColor="${xmlEscape(
		element.textColor,
	)}" backgroundColor="${xmlEscape(
		element.backgroundColor,
	)}" font="Roboto-Light" fontSize="${element.fontSize}" Clock_dos="0" Clock_dws="0" widgetType="Clock" isKioskMode="false" Live_Update_ID="${xmlEscape(
		liveId,
	)}" ${extra}><AttachmentFiles/></Content>`;
};

const buildShapeContent = (element: ShapeElement, liveId: string) => {
	const shape =
		element.type === "rectangle" || element.type === "rounded-rectangle"
			? "rect"
			: element.type === "circle"
				? "circle"
				: "polygon";
	return `<Content isVideoFillArea="false" Detect_Picture_Orientation="false" MuteVideo="true" showType="Default" scaleType="FIT_CENTER" duration="10" FloatIn_Direction="0" Live_Update_type="0" Live_Update_type_storage="0" Live_Update_path="" Live_Update_port="21" Live_Update_ID="${xmlEscape(
		liveId,
	)}" Live_Update_userName="" Live_Update_password="" Live_Update_Frequency="15" Live_Update_Access_Way="0" Live_Update_Show_Status="false" shape="${shape}" polygon_count="5" angle="0" inner_radius="45" outter_radius="100" fill="${xmlEscape(
		element.fill,
	)}" strokeWidth="0" stroke="#FF000000" widgetType="Shape" isKioskMode="false" rect_width="${element.width}" rect_height="${element.height}" showArrow="false" doubleClickToFullScreen="false" resumeSignagePlaybackAfterIdle="-1"><AttachmentFiles/></Content>`;
};

const buildMediaContent = (element: MediaElement, liveId: string) => {
	const src = element.src || element.name;
	return `<Content isVideoFillArea="false" Detect_Picture_Orientation="false" MuteVideo="true" showType="Default" scaleType="FIT_CENTER" duration="10" showArrow="false" doubleClickToFullScreen="false" resumeSignagePlaybackAfterIdle="-1" isKioskMode="false" FloatIn_Direction="0" Live_Update_type="0" Live_Update_type_storage="0" Live_Update_path="" Live_Update_port="21" Live_Update_ID="${xmlEscape(
		liveId,
	)}" Live_Update_userName="" Live_Update_password="" Live_Update_Frequency="15" Live_Update_Access_Way="0" Live_Update_Show_Status="true" widgetType="null"><AttachmentFiles/><MediaItem duration="10" note="" pdfPageRange="" videoDuration="0" videoStartTime="" videoEndTime="" fileSize="0" src="${xmlEscape(
		src,
	)}"/></Content>`;
};

export const buildNovoDsXml = ({
	textElements,
	webPageElements,
	youTubeElements,
	qrCodeElements,
	weatherElements,
	clockElements,
	shapeElements,
	mediaElements,
}: NovoDsInput) => {
	const sections: string[] = [];
	let index = 0;
	const nextLiveId = () => `Page 1-${index + 1}`;

	textElements.forEach((element) => {
		const width = element.width ?? Math.max(1, element.text.length * element.fontSize);
		const height = Math.max(1, Math.round(element.fontSize * 1.4));
		sections.push(
			buildSection(
				index++,
				{
					X: element.x,
					Y: element.y,
					Width: Math.round(width),
					Height: height,
					ContentType: "Text",
				},
				buildTextContent(element, nextLiveId()),
			),
		);
	});

	webPageElements.forEach((element) => {
		sections.push(
			buildSection(
				index++,
				{
					X: element.x,
					Y: element.y,
					Width: element.width,
					Height: element.height,
					ContentType: "Web Page",
				},
				buildWebPageContent(element, nextLiveId()),
			),
		);
	});

	youTubeElements.forEach((element) => {
		sections.push(
			buildSection(
				index++,
				{
					X: element.x,
					Y: element.y,
					Width: element.width,
					Height: element.height,
					ContentType: "Youtube",
				},
				buildYouTubeContent(element, nextLiveId()),
			),
		);
	});

	qrCodeElements.forEach((element) => {
		sections.push(
			buildSection(
				index++,
				{
					X: element.x,
					Y: element.y,
					Width: element.size,
					Height: element.size,
					ContentType: "Text",
				},
				buildQrCodeContent(element, nextLiveId()),
			),
		);
	});

	weatherElements.forEach((element) => {
		sections.push(
			buildSection(
				index++,
				{
					X: element.x,
					Y: element.y,
					Width: element.width,
					Height: element.height,
					ContentType: "Misc",
				},
				buildWeatherContent(element, nextLiveId()),
			),
		);
	});

	clockElements.forEach((element) => {
		sections.push(
			buildSection(
				index++,
				{
					X: element.x,
					Y: element.y,
					Width: element.width,
					Height: element.height,
					ContentType: "Misc",
				},
				buildClockContent(element, nextLiveId()),
			),
		);
	});

	shapeElements.forEach((element) => {
		sections.push(
			buildSection(
				index++,
				{
					X: element.x,
					Y: element.y,
					Width: element.width,
					Height: element.height,
					ContentType: "Media",
				},
				buildShapeContent(element, nextLiveId()),
			),
		);
	});

	mediaElements.forEach((element) => {
		sections.push(
			buildSection(
				index++,
				{
					X: element.x,
					Y: element.y,
					Width: element.width,
					Height: element.height,
					ContentType: "Media",
				},
				buildMediaContent(element, nextLiveId()),
			),
		);
	});

	return `<?xml version='1.0'?>\n<NovoDS Version="1.1" Purpose="" Description="" Playlist_UUID="" Layout_Type="1" Display_Mode="default" Model_Type="ds200" Show_ConnOverlay="false" ConnOverlay_Value="false" supportBulletinBoard="false" Interactive="false"><Pages><Page Column="${DOC_DIMENSIONS.width}" Row="${DOC_DIMENSIONS.height}" Orientation="0" SerialNumber="Page 1" AudioSource="1" ID="Page 1" Description="" Layout="@Frame Designer@" FreeDesignerMode="true" BackgroundImage="" BackgroundImageFromColorCode="" BackgroundMusic="" BackgroundMusicUrl="" BackgroundImageSize="0" BackgroundMusicSize="0" BgMusicApplyToAll="false">${sections.join(
		"",
	)}</Page></Pages><Timeline Looping="true"><Item Duration="1800" Page="Page 1"/></Timeline><BottomPage Description="" Row="1" Column="1" ID="Background" SerialNumber="Background" BackgroundColor="#00000000" Layout="Landscape 1" Orientation="0"><Section Width="1" Index="0" Height="1" X="0" ContentType="Media" Y="0"><Content isVideoFillArea="false" Detect_Picture_Orientation="false" MuteVideo="true" showType="Default" scaleType="FIT_CENTER" duration="10" showArrow="false" doubleClickToFullScreen="true" resumeSignagePlaybackAfterIdle="-1" isKioskMode="true" FloatIn_Direction="0" Live_Update_type="0" Live_Update_type_storage="0" Live_Update_path="" Live_Update_port="21" Live_Update_ID="Background-1" Live_Update_userName="" Live_Update_password="" Live_Update_Frequency="15" Live_Update_Access_Way="0" Live_Update_Show_Status="true" widgetType="null"><AttachmentFiles/><MediaItem duration="10" note="" pdfPageRange="" videoDuration="0" videoStartTime="" videoEndTime="" fileSize="0" src="backgrounddesign_white.png"/></Content></Section></BottomPage></NovoDS>\n`;
};
