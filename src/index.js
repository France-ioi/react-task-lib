import React from 'react';

import {library} from '@fortawesome/fontawesome-svg-core';
import {faPlus} from '@fortawesome/free-solid-svg-icons/faPlus';
import {faStickyNote} from '@fortawesome/free-solid-svg-icons/faStickyNote';
import {faTimes} from '@fortawesome/free-solid-svg-icons/faTimes';
import {faCheck} from '@fortawesome/free-solid-svg-icons/faCheck';
import {faLock} from '@fortawesome/free-solid-svg-icons/faLock';
import {faLockOpen} from '@fortawesome/free-solid-svg-icons/faLockOpen';
import {faSpinner} from '@fortawesome/free-solid-svg-icons/faSpinner';
import {faThumbtack} from '@fortawesome/free-solid-svg-icons/faThumbtack';
import {faChevronUp} from '@fortawesome/free-solid-svg-icons/faChevronUp';
import {faChevronLeft} from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import {faChevronRight} from '@fortawesome/free-solid-svg-icons/faChevronRight';
import {faChevronDown} from '@fortawesome/free-solid-svg-icons/faChevronDown';
import {faQuestionCircle} from '@fortawesome/free-solid-svg-icons/faQuestionCircle';
library.add(
  faPlus, faStickyNote, faTimes, faCheck, faLock, faLockOpen, faSpinner, faThumbtack, faChevronUp,
  faChevronDown, faChevronLeft, faChevronRight, faQuestionCircle,
);

import styles from './style.scss'

import Collapsable from "./components/Collapsable";
import TutorialCarousel from "./components/TutorialCarousel";

export {
  Collapsable,
  TutorialCarousel,
};
