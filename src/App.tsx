import Header from "@features/editor/components/Header";
import Widgets from "@features/editor/components/Widgets";
import Editor from "@features/editor/components/Editor";
import "./App.css";

function App() {
	return (
		<div className="app">
			<Header />
			<Widgets />
			<Editor />
		</div>
	);
}

export default App;
