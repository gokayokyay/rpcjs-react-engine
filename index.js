import React from "react";
import ReactDOM from "react-dom";
import { RPCEngineBase, PROCEDURES } from "@rpcjs/core";
import { events } from "./constants";

export default class RPCEngineReact extends RPCEngineBase {
  constructor() {
    super();
    this.events = events;
  };
  getElementByKey(elementKey) {
    return this.elements.find(({ key }) => key === elementKey);
  }
  getDOMElementByKey(elementKey) {
    console.log(document.querySelector(`[data-rpckey=${elementKey}]`));
    return document.querySelector(`[data-rpckey=${elementKey}]`);
  }
  constructRecursiveChildren(children) {
    return children.map(child => {
      if (typeof child === 'string') return child;
      const { key, elementType, children: childrenNodes = [], props = {}, eventTypes = [] } = child;
      const eventfulProps = this.attachEventListeners(key, eventTypes, props);
      const rpcAttachedProps = this.attachRPCKey(key, eventfulProps);
      const element = React.createElement(elementType, rpcAttachedProps, ...(childrenNodes.map ? this.constructRecursiveChildren(childrenNodes) : [childrenNodes]));
      this.addElement(key, element, () => {
        this.getDOMElementByKey(key).parentElement.removeChild(this.getDOMElementByKey(key));
      });
      return element;
    })
  };
  attachEventListeners(key, eventTypes = [], originalProps) {
    const eventTypesToAttach = eventTypes.map(type => Object.keys(this.events).includes(type) ? this.events[type] : type).flat(2);
    const props = eventTypesToAttach.reduce((prev, curr) => {
      return { ...prev, [curr]: event => {
        // console.log(event.target);
        this.respondEvent(RPCEngineReact.createEventObject(key, event));
      } };
    }, originalProps);
    return props;
  }
  attachRPCKey(key, props){
    return {
      ...props,
      'data-rpckey': key
    };
  }
  addElement(key, element, removeFn) {
    this.elements = [...this.elements, {
      key,
      element,
      removeFn
    }];
  }

  removeElement(elementKey) {
    const index = this.elements.findIndex(({ key }) => key === elementKey);
    const element = this.elements[index];
    if (element && element.removeFn) {
      element.removeFn();
    }
    this.elements = this.elements.filter(({ key }) => key !== elementKey);
  }

  handleProcedure({ type, data }) {
    switch (type) {
      case PROCEDURES.CREATE_ELEMENT: {
        const { parentID, key, elementType, children: childrenNodes = [], props = {}, eventTypes = [] } = data;
        if (!parentID || !key || !elementType) {
          throw new Error('Missing properties, needed parentID, key and elementType to execute CREATE_ELEMENT procedure.');
        }
        const parent = document.getElementById(parentID);
        console.log(parent);
        if (props.__dangerouslySetInnerHTML) {
          props.__dangerouslySetInnerHTML = null;
        }
        const eventfulProps = this.attachEventListeners(key, eventTypes, props);
        const rpcAttachedProps = this.attachRPCKey(key, eventfulProps);

        const children = childrenNodes && childrenNodes.map ? this.constructRecursiveChildren(childrenNodes) : childrenNodes;

        const element = React.createElement(elementType, rpcAttachedProps, ...children);
        this.addElement(key, element, () => ReactDOM.unmountComponentAtNode(parent));
        console.log('geldi');
        ReactDOM.render(element, parent);
        break;
      }
      case PROCEDURES.REMOVE_ELEMENT: {
        const { key } = data;
        if (!key) {
          throw new Error('Missing properties, needed key to execute REMOVE_ELEMENT procedure.');
        }
        this.removeElement(key);
        break;
      }
      default:
        break;
    }
  }
}
