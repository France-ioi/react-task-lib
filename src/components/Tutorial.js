import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import ReactHtmlParser from 'react-html-parser/src';
import TutorialCarousel from './TutorialCarousel';

export const TaskInstructions = (props) => {
  const html = document.getElementById('instructions').innerHTML;

  return <div>{ReactHtmlParser(html, {transform: (node) => transformNode(node, props)})}</div>;
}

export const Tutorial = (props) => {
  const element = document.getElementById(props.category);
  if (!element) {
    return null;
  }

  const html = document.getElementById(props.category).innerHTML;

  return <TutorialCarousel>
    {ReactHtmlParser(html, {transform: (node) => transformNode(node, props)})}
  </TutorialCarousel>;
}

function transformNode(node, props) {
  if (node.type === 'tag' && node.name === 'fontawesomeicon') {
    return <FontAwesomeIcon icon={node.attribs.icon} style={convertStyleToObject(node.attribs.style)}/>;
  }

  if (node.attribs && node.attribs['data-version']) {
    let authorizedVersions = node.attribs['data-version'];
    if (!Array.isArray(authorizedVersions)) {
      authorizedVersions = [authorizedVersions];
    }

    return (-1 !== authorizedVersions.indexOf(props.version.version) ? undefined : null);
  }

  return undefined;
}

function convertStyleToObject(styles) {
  return styles.split(';').map(cur => cur.split(':')).reduce((acc, val) => {
    let [key, value] = val.map(e => e.trim());
    key = key.replace(/-./g, css => css.toUpperCase()[1])
    acc[key] = value;
    return acc;
  }, {});
}
