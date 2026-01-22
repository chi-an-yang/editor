import * as React from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select, { type SelectChangeEvent } from "@mui/material/Select";
import { useTranslation } from "react-i18next";

export default function LanguageSelector() {
	const { t, i18n } = useTranslation();

	const [lng, setLng] = React.useState<string>(
		i18n.resolvedLanguage ?? i18n.language ?? "zh-TW",
	);

	const handleChange = (event: SelectChangeEvent<string>) => {
		const nextLng = event.target.value;
		setLng(nextLng);
		void i18n.changeLanguage(nextLng);
	};

	return (
		<Box sx={{ minWidth: 160 }}>
			<FormControl variant="standard" fullWidth size="small">
				<Select
					labelId="language-select-label"
					id="language-select"
					value={lng}
					label={t("language")}
					onChange={handleChange}
				>
					<MenuItem value="en">{t("english")}</MenuItem>
					<MenuItem value="zh-TW">{t("traditionalChinese")}</MenuItem>
				</Select>
			</FormControl>
		</Box>
	);
}
