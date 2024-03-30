import { useEffect, useRef, useState } from 'react';
import { Card, Popover, Button, Text, Tag, Classes } from '@blueprintjs/core';

export const PathCard = ({
  path,
  index,
}: {
  path: number[];
  index: number;
}) => {
  const pathStr = path.join('->');
  const ref = useRef<null | HTMLDivElement>(null);
  const textObserver = useRef<null | ResizeObserver>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  const handleResize = (entris: ResizeObserverEntry[]) => {
    if (entris.length > 0)
      setIsOverflow(
        entris[0].target.scrollWidth > entris[0].target.clientWidth,
      );
  };

  useEffect(() => {
    textObserver.current = new ResizeObserver(handleResize);
    textObserver.current.observe(ref.current!);

    return () => {
      textObserver.current!.disconnect();
    };
  }, []);

  const onOpening = () => {
    const popoverContents = document.querySelectorAll('.bp5-popover-content');
    if (popoverContents.length > 0) {
      popoverContents.forEach((popoverContent) => {
        popoverContent.setAttribute('style', 'overflow-y: auto');
      });
    }
  };

  return (
    <Card compact>
      <Tag minimal>{index + 1}</Tag>
      <Text className="path-text" ref={ref} ellipsize>
        {pathStr}
      </Text>
      {isOverflow && (
        <Popover
          onOpening={onOpening}
          placement="top"
          popoverClassName={Classes.POPOVER_CONTENT_SIZING}
          content={pathStr}
        >
          <Button minimal intent="primary" small text="more" />
        </Popover>
      )}
    </Card>
  );
};
