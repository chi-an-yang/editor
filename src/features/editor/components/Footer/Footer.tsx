import Box from "@mui/material/Box";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";

type FooterProps = {
	zoomPercent: number;
	onZoomChange: (nextPercent: number) => void;
	onFit: () => void;
	onReset: () => void;
};

const Footer = ({ zoomPercent, onZoomChange, onFit, onReset }: FooterProps) => {
	return (
		<footer className="flex w-full items-center justify-end gap-4 border-t border-slate-200 bg-white px-4 py-2">
			<Box className="flex items-center gap-4">
				<div className="flex items-center gap-2 text-sm">
					<button
						className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50"
						onClick={onFit}
					>
						Fit
					</button>
					<button
						className="rounded border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50"
						onClick={onReset}
					>
						100%
					</button>
				</div>
				<Slider
					aria-label="Zoom"
					min={10}
					max={200}
					step={1}
					value={zoomPercent}
					onChange={(_, value) => {
						if (typeof value === "number") {
							onZoomChange(value);
						}
					}}
					sx={{ maxWidth: 100 }}
				/>
				<Typography variant="body2" color="text.secondary" sx={{ minWidth: 48 }}>
					{zoomPercent}%
				</Typography>
			</Box>
		</footer>
	);
};

export default Footer;
