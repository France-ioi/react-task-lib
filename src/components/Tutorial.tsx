import React from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import convertHtmlToReact from '@hedgedoc/html-to-react';
import TutorialCarousel from './TutorialCarousel';

export const TaskInstructions = (props) => {
  const html = document.getElementById('instructions').innerHTML;

  return <div>{convertHtmlToReact(html, {transform: (node) => transformNode(node, props)})}</div>;
}

export const Tutorial = (props) => {
  const element = document.getElementById(props.category);
  if (!element) {
    return null;
  }

  const html = document.getElementById(props.category).innerHTML;

  const carouselElements = convertHtmlToReact(html, {transform: (node) => transformNode(node, props)});

  return <TutorialCarousel>
    {Array.isArray(carouselElements) ? carouselElements.filter(a => null !== a && (typeof a !== 'string' || a.trim().length)) : carouselElements}
  </TutorialCarousel>;
}

function transformNode(node, props) {
  if (node.type === 'tag' && node.name === 'fontawesomeicon') {
    return <FontAwesomeIcon icon={node.attribs.icon} style={convertStyleToObject(node.attribs.style)}/>;
  }

  if (node.attribs && node.attribs['data-version']) {
    let authorizedVersions = node.attribs['data-version'].split(',');

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
