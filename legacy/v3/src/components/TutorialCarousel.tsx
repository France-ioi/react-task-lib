import React from 'react';
import {Carousel} from 'react-bootstrap';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

function TutorialCarousel({children}) {
  return (
    <div>
      <Carousel
        interval={null}
        wrap={false}
        prevIcon={<FontAwesomeIcon icon="chevron-left" size="lg"/>}
        nextIcon={<FontAwesomeIcon icon="chevron-right" size="lg"/>}
      >
        {children.map((child, index) => <Carousel.Item key={index}>{child}</Carousel.Item>)}
      </Carousel>
    </div>
  );
}

export default TutorialCarousel;
