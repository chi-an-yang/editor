type MediaProps = {
	className?: string;
};

const Media = ({ className }: MediaProps) => {
	return (
		<button
			type="button"
			className={`flex w-full flex-col items-center gap-1 rounded-md p-2 text-xs font-medium text-slate-700 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
				className ?? ""
			}`}
			aria-label="Media"
		>
			<span
				className="h-6 w-6 rounded-md border border-slate-400 bg-white"
				aria-hidden="true"
			/>
			Media
		</button>
	);
};

export default Media;
