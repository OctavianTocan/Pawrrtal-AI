/* @refresh reload */
import { render } from 'solid-js/web';
import { App } from './App';
import './styles.css';

const root = document.getElementById('root');
if (root === null) throw new Error('#root missing in index.html');
render(() => <App />, root);
