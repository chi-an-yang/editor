type YouTubeProps = {
	className?: string;
	isActive?: boolean;
	onClick?: () => void;
	ariaLabel?: string;
};

const YouTube = ({ className, isActive, onClick, ariaLabel }: YouTubeProps) => {
	return (
		<button
			type="button"
			className={`flex w-full flex-col items-center gap-1 rounded-md p-2 text-xs font-medium text-slate-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 ${
				isActive ? "bg-slate-200 text-slate-900" : "hover:bg-slate-200"
			} ${className ?? ""}`}
			aria-label={ariaLabel ?? "YouTube"}
			aria-pressed={isActive}
			onClick={onClick}
		>
			<span
				className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-400 bg-white text-[10px] font-semibold text-red-500"
				aria-hidden="true"
			>
				YT
			</span>
			YouTube
		</button>
	);
};

export default YouTube;
