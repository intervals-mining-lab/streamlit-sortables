import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps
} from "streamlit-component-lib"
import React, { ReactNode, useState, useEffect } from "react"
import {
  DndContext,
  useDroppable,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';

import { SortableItem } from "./SortableItem"
import './SortableComponent.css'


type Direction = 'horizontal' | 'vertical';

interface StreamlitArguments {
  direction?: Direction,
  items: ContainerDescription[],
  customStyle?: string
}

interface ContainerDescription {
  header: string,
  items: string[]
}

interface ContainerProps {
  header: string,
  items: { id: string, text: string }[],
  direction?: Direction,
  width?: number,
  children?: ReactNode
}

function Container(props: ContainerProps) {
  const { setNodeRef } = useDroppable({
    id: props.header,
  });

  return (
    <div className="sortable-container" ref={setNodeRef} style={{ width: props.width }}>
      {
        props.header ? (<div className="sortable-container-header">{props.header}</div>) : null
      }
      <SortableContext id={props.header} items={props.items} strategy={rectSortingStrategy}>
        <div className="sortable-container-body">
          {props.children}
        </div>
      </SortableContext>
    </div>
  )
}

interface SortableComponentProps {
  direction?: Direction,
  items: ContainerDescription[]
}

function SortableComponent(props: SortableComponentProps) {
  const itemsWithIds = props.items.map(
    ({ header, items }) => ({
      header,
      items: items.map((item, index) => ({ id: index.toString(), text: item }))
    })
  )
  const [items, setItems] = useState(itemsWithIds);
  const [clonedItems, setClonedItems] = useState(itemsWithIds);
  const [activeItem, setActiveItem] = useState({id: null, text: null});

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragStart={handleDragStart}
      onDragCancel={handleDragCancel}
    >
      {
        items.map(({ header, items }) => {
          return (
            <Container key={header} header={header} items={items} direction={props.direction}>
              {
                items.map((item) => {
                  return (
                    <SortableItem key={item.id} id={item.id} isActive={item.id === activeItem.id}>{item.text}</SortableItem>
                  )
                })
              }
            </Container>
          )
        })
      }
      <DragOverlay>
        <SortableItem id="" isOverlay={true}>{activeItem.text}</SortableItem>
      </DragOverlay>
    </DndContext>
  );

  function handleDragStart(event: any) {
    setActiveItem({id: event.active.id, text: event.active.text});
    setClonedItems(items);
  }

  function handleDragCancel() {
    console.log('canceled')
    setActiveItem({id: null, text: null});
    setItems(clonedItems);
  }

  function handleDragEnd(event: any) {
    setActiveItem({id: null, text: null});
    const { active, over } = event;
    if (!over) {
      return
    }

    const activeContainerIndex = findContainer(active.id);
    const overContainerIndex = findContainer(over.id);

    if (activeContainerIndex === overContainerIndex) {
      const container = items[activeContainerIndex];
      const activeItemIndex = container.items.findIndex(item => item.id === active.id);
      const overItemIndex = container.items.findIndex(item => item.id === over.id);

      const newItems = items.map(({ header, items }, index) => {
        if (index === activeContainerIndex) {
          return {
            header: header,
            items: arrayMove(items, activeItemIndex, overItemIndex)
          }
        } else {
          return {
            header: header,
            items: items
          }
        }
      })

      setItems(newItems);
      if (!isSameOrder(clonedItems, newItems)) {
        const transformedItems = newItems.map(({ header, items }) => ({
          header,
          items: items.map(item => item.text)
        }));
        Streamlit.setComponentValue(transformedItems);
        Streamlit.setFrameHeight();
      }
    }
  }

  function handleDragOver(event: any) {
    const { active, over } = event;

    if (!over) {
      return
    }
    const activeContainerIndex = findContainer(active.id);
    const overContainerIndex = findContainer(over.id);
    if (overContainerIndex < 0) {
      return;
    }

    if (activeContainerIndex === overContainerIndex) {
      return
    }
    console.log(active.id, over.id)

    const activeItemIndex = items[activeContainerIndex].items.indexOf(active.id);
    const activeItem = items[activeContainerIndex].items[activeItemIndex];
    const newItems = items.map(({ header, items }, index) => {
      if (index === activeContainerIndex) {
        return {
          header: header,
          items: [...items.slice(0, activeItemIndex), ...items.slice(activeItemIndex + 1)]
        }
      } else if (index === overContainerIndex) {
        return {
          header: header,
          items: [...items.slice(0, activeItemIndex), activeItem, ...items.slice(activeItemIndex)]
        }
      } else {
        return {
          header: header,
          items: items
        }
      }
    })
    setItems(newItems);
  }

  function findContainer(item: string) {
    const containerIndex = items.findIndex(({ header }) => header === item);
    if (containerIndex >= 0) {
      return containerIndex;
    }
    return items.findIndex(({ items }) => items.some(x => x.id === item));
  }

  function isSameOrder(items1: { header: string; items: { id: string; text: string; }[]; }[], items2: { header: string; items: { id: string; text: string; }[]; }[]) {
    if (items1.length !== items2.length) {
      return false;
    }

    return items1.every(({ header, items }, index) => {
      const container2 = items2[index];
      if (header !== container2.header) {
        return false;
      }
      return items.every((item, index) => {
        return item.id === container2.items[index].id;
      });
    })
  }
}

function SortableComponentWrapper(props: ComponentProps) {
  
  const args: StreamlitArguments = props.args;
  const items = args.items;
  const className = 'sortable-component ' + args.direction;
  useEffect(() => Streamlit.setFrameHeight());

  return (
    <div className={className}> 
      <style>{args.customStyle}</style>
      <SortableComponent items={items} direction={args.direction} />
    </div>
  )
}

export default withStreamlitConnection(SortableComponentWrapper)
