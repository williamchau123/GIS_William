import { AppProps } from "next/app";
import "../styles/Map.css";


const App = ({ Component, pageProps }: AppProps) => {
  return (
    <Component {...pageProps} />
  );
};

export default App;
