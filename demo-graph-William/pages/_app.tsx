import { AppProps } from "next/app";
import "../styles/Map.css";
import "../styles/Globals.css";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <Component {...pageProps} />
  );
};

export default App;
