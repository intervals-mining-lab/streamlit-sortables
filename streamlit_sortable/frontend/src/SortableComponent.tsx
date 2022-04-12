import {
  Streamlit,
  withStreamlitConnection,
} from "streamlit-component-lib"
import React, { ReactNode, useState, useEffect } from "react"
import {
  DndContext, 
  useDroppable,
  DragOverlay,
  closestCenter,
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

import {SortableItem} from "./SortableItem"
import './SortableComponent.css'


type Direction = 'horizontal' | 'vertical';

interface StreamlitArguments {
  direction?: Direction,
  items: ContainerDescription[],
}

interface ContainerDescription {
  header: string,
  items: string[]
}

interface SortableComponentWrapperState {
  items: ContainerDescription[]
}

interface ContainerProps {
  header: string,
  items: string[],
  direction?: Direction,
  width?: number,
  children?: ReactNode,
}

function Container(props: ContainerProps) {
  const {setNodeRef} = useDroppable({
    id: props.header,
  });

  const className = "sortable-container ";// + (props.direction === 'vertical' ? "vertical" : "horizontal");

  return (
    <div className={className} ref={setNodeRef} style={{width: props.width}}>
      {
        props.header? (<div className="container-header">{props.header}</div>): null
      }
        <SortableContext id={props.header} items={props.items} strategy={rectSortingStrategy}>
          <div className="container-body">
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

function SortableComponent (props: SortableComponentProps){
  const [items, setItems] = useState(props.items);
  const [clonedItems, setClonedItems] = useState(props.items);
  const [activeItem, setActiveItem] = useState(null);
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
        items.map(({header, items}) => {
          return (
            <Container key={header} header={header} items={items} direction={props.direction}>
              {
                items.map(item => {
                  return (
                    <SortableItem key={item} id={item} isActive={item===activeItem}>{item}</SortableItem>
                  )
                })
              }
            </Container>
          )
        })
      }
      <DragOverlay>
        {
          activeItem? (<SortableItem id="">{activeItem}</SortableItem>):null
        }
      </DragOverlay>
    </DndContext>
  );

  function handleDragStart(event: any) {
    setActiveItem(event.active.id);
    setClonedItems(items);
  }

  function handleDragCancel() {
    setActiveItem(null);
    setItems(clonedItems);
  }

  function handleDragEnd(event: any) {
    setActiveItem(null);
    const {active, over} = event;
    if (!over) {
      return
    }
    if (active.id === over.id) {
      return;
    }

    const activeContainerIndex = findContainer(active.id);
    const overContainerIndex = findContainer(over.id);

    if (activeContainerIndex === overContainerIndex) {
      const container = items[activeContainerIndex];
      const activeItemIndex = container.items.indexOf(active.id);
      const overItemIndex = container.items.indexOf(over.id);

      const newItems = items.map(({header, items}, index) => {
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
      Streamlit.setComponentValue(newItems);
    }
  }

  function handleDragOver(event: any) {
    const {active, over} = event;

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
    const newItems = items.map(({header, items}, index) => {
      if (index === activeContainerIndex) {
        return {
          header: header,
          items: [...items.slice(0, activeItemIndex),  ...items.slice(activeItemIndex + 1)]
        }
      } else if (index === overContainerIndex) {
        return {
          header: header,
          items: [...items.slice(0, activeItemIndex),  activeItem, ...items.slice(activeItemIndex)]
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
    const containerIndex = items.findIndex(({header}) => header === item);
    if (containerIndex >= 0) {
      return containerIndex;
    }
    return items.findIndex(({items}) => items.includes(item));
  }
}

function SortableComponentWrapper(props: any) {
  const args: StreamlitArguments = props.args;
  const items = args.items;
  const className = 'sortable-component ' + args.direction;
  useEffect(() => Streamlit.setFrameHeight());

  return (
    <div className={className}>
      <SortableComponent items={items} direction={args.direction} />
    </div>
  )
}



export default withStreamlitConnection(SortableComponentWrapper)
