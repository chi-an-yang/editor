import Header from "@features/editor/components/Header";
import Widgets from "@features/editor/components/Widgets";
import Editor from "@features/editor/components/Editor";
import { EditorProvider } from "@features/editor/context/EditorContext";
import "./App.css";

function App() {
	return (
		<EditorProvider>
			<div className="app">
				<Header />
				<Widgets />
				<Editor />
			</div>
		</EditorProvider>
	);
}

export default App;
