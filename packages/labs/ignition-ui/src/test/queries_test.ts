import {render, html} from 'lit';
import {assert} from '@esm-bundle/chai';
import {getPositionInLitTemplate} from '../lib/frame/queries.js';

const normalizeExpressionMarkers = (html: string | undefined) =>
  html?.replace(
    /<!--\?lit\$[0-9]+\$-->|<!--\??-->|lit\$[0-9]+\$/g,
    '<!--marker-->'
  );

const assertTemplateInnerHtmlIs = (
  position: ReturnType<typeof getPositionInLitTemplate>,
  expectedHtml: string
) =>
  assert.equal(
    normalizeExpressionMarkers(position?.template?.el.innerHTML)
      // Normalize all whitespace to not be more than a single space.
      ?.replace(/\s\s+/g, ' '),
    expectedHtml
  );

suite('locateLitTemplate', () => {
  let container: HTMLDivElement;

  setup(() => {
    container = document.createElement('div');
    container.id = 'container';
  });

  test('simple query in a single Template', () => {
    render(html`<div id="queried-el"></div>`, container);
    const el = container.querySelector<HTMLDivElement>('#queried-el')!;
    const position = getPositionInLitTemplate(el)!;
    assertTemplateInnerHtmlIs(position, '<div id="queried-el"></div>');
  });

  test('query inner template in nested templates', () => {
    render(
      html`<div class="outer">
        ${html`<div class="middle">
          ${html`<div class="inner" id="queried-el"></div>`}
        </div>`}
      </div>`,
      container
    );
    const el = container.querySelector<HTMLDivElement>('#queried-el')!;
    const position = getPositionInLitTemplate(el)!;
    assertTemplateInnerHtmlIs(
      position,
      '<div class="inner" id="queried-el"></div>'
    );
  });

  test('query middle template in nested templates', () => {
    render(
      html`<div class="outer">
        ${html`<div class="middle" id="queried-el">
          ${html`<div class="inner"></div>`}
        </div>`}
      </div>`,
      container
    );
    const el = container.querySelector<HTMLDivElement>('#queried-el')!;
    const position = getPositionInLitTemplate(el)!;
    assertTemplateInnerHtmlIs(
      position,
      '<div class="middle" id="queried-el"> <!--marker--> </div>'
    );
  });

  test('query outer template in nested templates', () => {
    render(
      html`<div class="outer" id="queried-el">
        ${html`<div class="middle">${html`<div class="inner"></div>`}</div>`}
      </div>`,
      container
    );
    const el = container.querySelector<HTMLDivElement>('#queried-el')!;
    const position = getPositionInLitTemplate(el);
    assertTemplateInnerHtmlIs(
      position,
      '<div class="outer" id="queried-el"> <!--marker--> </div>'
    );
  });

  test('query child part with endNode', () => {
    render(
      html`<div class="parent">
        ${html`<div class="one"></div>`}${html`<div
          class="two"
        ></div>`}${html`<div class="three"></div>`}
      </div>`,
      container
    );

    const tests = [
      ['.one', '<div class="one"></div>'],
      ['.two', '<div class="two"></div>'],
      ['.three', '<div class="three"></div>'],
      [
        '.parent',
        '<div class="parent"> <!--marker--><!--marker--><!--marker--> </div>',
      ],
    ];
    for (const [queryEl, expectHtml] of tests) {
      const el = container.querySelector<HTMLDivElement>(queryEl)!;
      const position = getPositionInLitTemplate(el)!;
      assertTemplateInnerHtmlIs(position, expectHtml);
    }
  });

  test('query into custom element with its own render root', () => {
    customElements.define(
      'x-el',
      class extends HTMLElement {
        constructor() {
          super();
          const renderRoot = this.attachShadow({mode: 'open'});
          render(
            html`<span>In x-el</span>
              <div></div>`,
            renderRoot
          );
        }
      }
    );

    render(html`<div class="parent">${html`<x-el></x-el>`}</div>`, container);

    const tests = [
      ['.parent', '<div class="parent"><!--marker--></div>'],
      ['x-el', '<x-el></x-el>'],
    ];
    for (const [queryEl, expectHtml] of tests) {
      const el = container.querySelector<HTMLDivElement>(queryEl)!;
      const position = getPositionInLitTemplate(el)!;
      assertTemplateInnerHtmlIs(position, expectHtml);
    }

    // Show that we can query with multiple render roots. E.g., a LitElement
    // that renders into its own shadow root.
    const queryElInShadowRoot = container
      .querySelector('x-el')!
      .shadowRoot?.querySelector('div');
    assert.instanceOf(queryElInShadowRoot, HTMLDivElement);
    const position = getPositionInLitTemplate(queryElInShadowRoot!)!;
    assertTemplateInnerHtmlIs(position, '<span>In x-el</span> <div></div>');
  });

  test('query into custom element without its own render root', () => {
    customElements.define(
      'y-el',
      class extends HTMLElement {
        constructor() {
          super();
          const renderRoot = this.attachShadow({mode: 'open'});
          renderRoot.innerHTML = `<span>In y-el</span><div></div>`;
        }
      }
    );

    render(html`<div class="parent">${html`<y-el></y-el>`}</div>`, container);

    // Show that we can pierce shadow roots to locate elements.
    const queryElInShadowRoot = container
      .querySelector('y-el')!
      .shadowRoot?.querySelector('div');
    assert.instanceOf(queryElInShadowRoot, HTMLDivElement);
    const position = getPositionInLitTemplate(queryElInShadowRoot!)!;
    assertTemplateInnerHtmlIs(position, '<y-el></y-el>');
  });

  test('query slotted elements', () => {
    customElements.define(
      `test-slot-el`,
      class extends HTMLElement {
        constructor() {
          super();
          const renderRoot = this.attachShadow({mode: 'open'});
          render(
            html`
              ${html`<div id="in-div-template">
                <slot name="child"></slot>
              </div>`}
              ${html`<slot
                ><div id="default-content">Default Content</div></slot
              >`}
            `,
            renderRoot
          );
        }
      }
    );

    render(
      html`<test-slot-el>
        ${html`<div id="into-child" slot="child"></div>`}
      </test-slot-el>`,
      container
    );

    const shadowRoot = container.querySelector('test-slot-el')!.shadowRoot!;

    const defaultContentEl =
      shadowRoot.querySelector<HTMLDivElement>('#default-content');
    assert.isDefined(defaultContentEl);
    assertTemplateInnerHtmlIs(
      getPositionInLitTemplate(defaultContentEl!)!,
      '<slot><div id="default-content">Default Content</div></slot>'
    );
    const projectedEl = container.querySelector<HTMLDivElement>('#into-child');
    assert.isDefined(projectedEl);
    assertTemplateInnerHtmlIs(
      getPositionInLitTemplate(projectedEl!)!,
      '<test-slot-el> <!--marker--> </test-slot-el>'
    );
  });
});
