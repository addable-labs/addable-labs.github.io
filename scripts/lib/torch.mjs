// The torch the torch figure draws ("torch-lights-up" in
// src/_includes/figures/figures.mjs, the article on Fluentor's name and
// logo), and how the article's cover lights it.
//
// The torch is the product's mark, a network of 35 nodes (the steps) and 74
// curved lines (the paths between them): MARK is its approved file, byte for
// byte, and the figure draws every node and line from it, never redrawn.
// COVER is what the article's cover (docs/images/the-pivot-to-fluentor.svg)
// adds to it, the same mark scaled into a 1200 x 630 plate: the plate and its
// faint grid, a soft glow behind the nodes of one route, a translucent plate
// that dims the rest of the torch a little, and the route itself, its lines'
// own curves drawn again in a brighter, wider stroke. The figure draws the
// cover's central square, so it ends on what the cover shows.
//
// These colours are the artwork's, not the site's. The torch keeps its
// colours in both themes (a logo that changes colour with the page around it
// is a logo people recognise less), so none of them is a token: they live
// here, beside the build code, and not under src/, where every colour is one
// of tokens.css (tests/theme.test.mjs). tests/torch.test.mjs holds MARK to
// the approved file's checksum and the figure to the cover, element by
// element.

/** The approved torch, the file byte for byte (its SHA-256 is MARK_SHA256). */
export const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="104 118 246 534" role="img" aria-label="Fluentor"><g fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M206.7 133.8C210.4 150.8 214.2 182.0 217.4 202.6" stroke="#ccad6c"/><path d="M206.7 133.8C245.9 177.4 223.9 160.3 255.8 209.5" stroke="#cbac6c"/><path d="M206.7 133.8C289.4 147.1 286.6 217.1 264.7 260.7" stroke="#cbaa6a"/><path d="M217.4 202.6C234.7 205.7 248.1 208.1 255.8 209.5" stroke="#ccaa69"/><path d="M217.4 202.6C209.8 216.8 207.3 221.5 192.0 249.8" stroke="#cda867"/><path d="M217.4 202.6C218.5 208.8 224.7 245.9 227.9 264.4" stroke="#cca766"/><path d="M156.4 209.5C167.8 239.7 178.0 241.9 192.0 249.8" stroke="#cda867"/><path d="M156.4 209.5C134.9 235.2 134.3 240.7 127.8 270.1" stroke="#cca565"/><path d="M156.4 209.5C152.1 234.4 156.4 280.4 159.0 310.6" stroke="#c99e5f"/><path d="M255.8 209.5C233.5 223.6 217.5 233.7 192.0 249.8" stroke="#cda867"/><path d="M255.8 209.5C258.5 224.9 259.4 230.0 264.7 260.7" stroke="#cca766"/><path d="M255.8 209.5C253.0 215.0 234.8 250.7 227.9 264.4" stroke="#cca665"/><path d="M301.0 219.7C292.7 237.0 293.5 244.9 264.7 260.7" stroke="#cca565"/><path d="M301.0 219.7C303.0 244.9 300.1 252.6 299.5 270.3" stroke="#cba463"/><path d="M301.0 219.7C323.1 245.4 329.6 261.7 328.7 299.8" stroke="#c99e5f"/><path d="M192.0 249.8C208.1 256.4 220.7 261.5 227.9 264.4" stroke="#c99f60"/><path d="M192.0 249.8C176.0 254.9 143.9 265.0 127.8 270.1" stroke="#c99e5f"/><path d="M192.0 249.8C183.8 265.0 168.9 292.4 159.0 310.6" stroke="#c49357"/><path d="M264.7 260.7C275.1 263.7 287.4 266.9 299.5 270.3" stroke="#c79b5d"/><path d="M264.7 260.7C264.3 267.3 263.1 289.1 262.3 304.3" stroke="#c39256"/><path d="M264.7 260.7C268.1 265.8 289.9 298.6 298.3 311.2" stroke="#c39055"/><path d="M227.9 264.4C181.3 291.5 172.8 301.4 159.0 310.6" stroke="#c29054"/><path d="M227.9 264.4C239.6 290.3 243.2 298.9 237.7 326.8" stroke="#c18c52"/><path d="M227.9 264.4C195.5 311.3 177.3 323.1 191.6 372.4" stroke="#bb814a"/><path d="M127.8 270.1C143.4 290.4 148.1 296.4 159.0 310.6" stroke="#c28e53"/><path d="M127.8 270.1C128.4 307.2 126.3 323.0 156.2 358.4" stroke="#bd834b"/><path d="M299.5 270.3C306.8 277.7 325.8 296.9 328.7 299.8" stroke="#c39155"/><path d="M299.5 270.3C299.2 280.5 298.4 307.1 298.3 311.2" stroke="#c28e53"/><path d="M328.7 299.8C312.1 306.3 310.5 306.7 298.3 311.2" stroke="#be874e"/><path d="M328.7 299.8C325.9 316.5 323.3 333.7 296.2 359.2" stroke="#b87c46"/><path d="M262.3 304.3C247.1 322.0 250.0 318.4 237.7 326.8" stroke="#bc824b"/><path d="M262.3 304.3C272.8 325.7 274.0 339.7 264.4 372.4" stroke="#b67844"/><path d="M159.0 310.6C157.9 329.7 158.2 325.0 156.2 358.4" stroke="#b77a45"/><path d="M159.0 310.6C167.2 326.0 179.1 355.5 191.6 372.4" stroke="#b57743"/><path d="M298.3 311.2C298.1 328.0 296.9 342.4 296.2 359.2" stroke="#b77945"/><path d="M298.3 311.2C289.4 326.2 277.1 355.7 264.4 372.4" stroke="#b57643"/><path d="M156.2 358.4C173.9 365.4 173.9 365.4 191.6 372.4" stroke="#af6d3d"/><path d="M296.2 359.2C277.9 368.8 279.2 367.9 264.4 372.4" stroke="#af6d3d"/><path d="M150.6 389.4C181.7 388.5 201.2 389.3 228.5 389.4" stroke="#af683b"/><path d="M228.5 389.4C259.6 389.3 279.0 388.7 306.2 389.4" stroke="#af683b"/><path d="M150.6 389.4C176.7 403.5 172.7 401.3 190.8 411.0" stroke="#ae663b"/><path d="M150.6 389.4C159.7 404.3 177.2 430.3 188.6 447.9" stroke="#ab6239"/><path d="M228.5 389.4C222.8 392.6 204.0 403.4 190.8 411.0" stroke="#ae663b"/><path d="M228.5 389.4C241.7 397.0 260.6 407.8 266.3 411.0" stroke="#ae663b"/><path d="M228.5 389.4C228.5 399.4 228.5 425.6 228.5 429.6" stroke="#ad653a"/><path d="M306.2 389.4C280.3 403.5 284.3 401.3 266.3 411.0" stroke="#ae663b"/><path d="M306.2 389.4C297.3 404.0 280.1 429.7 268.9 447.0" stroke="#ab6339"/><path d="M190.8 411.0C204.0 417.5 222.9 426.8 228.5 429.6" stroke="#ab6239"/><path d="M190.8 411.0C189.5 429.4 189.9 427.6 188.6 447.9" stroke="#a85f37"/><path d="M266.3 411.0C260.6 413.8 241.7 423.1 228.5 429.6" stroke="#ab6239"/><path d="M266.3 411.0C267.5 429.0 267.3 429.0 268.9 447.0" stroke="#a86037"/><path d="M228.5 429.6C222.5 432.3 202.6 441.5 188.6 447.9" stroke="#a55c36"/><path d="M228.5 429.6C242.6 435.7 262.8 444.4 268.9 447.0" stroke="#a55d36"/><path d="M228.5 429.6C228.5 457.7 228.5 463.4 228.6 485.9" stroke="#9b5533"/><path d="M188.6 447.9C208.6 466.9 208.6 466.9 228.6 485.9" stroke="#965032"/><path d="M188.6 447.9C196.7 506.9 192.6 477.4 200.1 532.2" stroke="#86452f"/><path d="M268.9 447.0C248.7 466.4 244.7 470.3 228.6 485.9" stroke="#965132"/><path d="M268.9 447.0C260.5 506.5 264.7 476.7 256.9 532.1" stroke="#86452f"/><path d="M228.6 485.9C214.3 509.1 214.3 509.1 200.1 532.2" stroke="#783c2b"/><path d="M228.6 485.9C242.7 509.0 242.7 509.0 256.9 532.1" stroke="#783c2b"/><path d="M228.6 485.9C228.5 540.9 228.5 509.4 228.5 564.4" stroke="#6a3327"/><path d="M200.1 532.2C210.1 543.5 224.2 559.6 228.5 564.4" stroke="#55281f"/><path d="M200.1 532.2C207.2 584.3 207.3 588.4 211.0 612.4" stroke="#49221b"/><path d="M256.9 532.1C252.6 536.9 238.4 553.1 228.5 564.4" stroke="#55281f"/><path d="M256.9 532.1C249.5 584.4 249.5 588.5 245.6 612.5" stroke="#49221b"/><path d="M228.5 564.4C217.5 587.5 217.5 595.7 211.0 612.4" stroke="#45201a"/><path d="M228.5 564.4C239.2 587.6 239.2 595.8 245.6 612.5" stroke="#45201a"/><path d="M228.5 564.4C228.4 581.0 228.1 614.2 227.9 630.8" stroke="#44201a"/><path d="M211.0 612.4C213.5 615.2 216.1 617.9 227.9 630.8" stroke="#411e1a"/><path d="M245.6 612.5C243.0 615.4 241.6 617.6 227.9 630.8" stroke="#411e1a"/><path d="M206.7 133.8C198.5 160.6 199.0 164.7 182.5 191.1" stroke="#ccae6d"/><path d="M182.5 191.1C174.7 216.7 175.2 229.0 192.0 249.8" stroke="#cca968"/><path d="M217.4 202.6C198.7 195.1 198.8 194.3 182.5 191.1" stroke="#cbaa6a"/><path d="M182.5 191.1C172.5 196.0 172.8 194.3 156.4 209.5" stroke="#cbaa6a"/></g><g><circle cx="206.7" cy="133.8" r="7.5" fill="#f9cc59"/><circle cx="217.4" cy="202.6" r="7.5" fill="#ffc754"/><circle cx="156.4" cy="209.5" r="7.5" fill="#fbbd42"/><circle cx="255.8" cy="209.5" r="7.5" fill="#f9c650"/><circle cx="301.0" cy="219.7" r="7.5" fill="#fcbe47"/><circle cx="192.0" cy="249.8" r="7.5" fill="#ffba41"/><circle cx="264.7" cy="260.7" r="7.5" fill="#feb336"/><circle cx="227.9" cy="264.4" r="7.5" fill="#fab037"/><circle cx="127.8" cy="270.1" r="7.5" fill="#f9ae3b"/><circle cx="299.5" cy="270.3" r="7.5" fill="#f9b139"/><circle cx="328.7" cy="299.8" r="7.5" fill="#f79a30"/><circle cx="262.3" cy="304.3" r="7.5" fill="#eb8a19"/><circle cx="159.0" cy="310.6" r="7.5" fill="#f4871e"/><circle cx="298.3" cy="311.2" r="7.5" fill="#fd9323"/><circle cx="237.7" cy="326.8" r="7.5" fill="#f98715"/><circle cx="156.2" cy="358.4" r="7.5" fill="#f5760f"/><circle cx="296.2" cy="359.2" r="7.5" fill="#f17a12"/><circle cx="191.6" cy="372.4" r="7.5" fill="#f16f0d"/><circle cx="264.4" cy="372.4" r="7.5" fill="#f27204"/><circle cx="150.6" cy="389.4" r="7.5" fill="#f16f0f"/><circle cx="228.5" cy="389.4" r="7.5" fill="#f0710a"/><circle cx="306.2" cy="389.4" r="7.5" fill="#f77e0d"/><circle cx="190.8" cy="411.0" r="7.5" fill="#f36710"/><circle cx="266.3" cy="411.0" r="7.5" fill="#ef6f0c"/><circle cx="228.5" cy="429.6" r="7.5" fill="#ea6111"/><circle cx="188.6" cy="447.9" r="7.5" fill="#d25211"/><circle cx="268.9" cy="447.0" r="7.5" fill="#dc5817"/><circle cx="228.6" cy="485.9" r="7.5" fill="#ad4017"/><circle cx="200.1" cy="532.2" r="7.5" fill="#933116"/><circle cx="256.9" cy="532.1" r="7.5" fill="#933019"/><circle cx="228.5" cy="564.4" r="7.5" fill="#5f1c14"/><circle cx="211.0" cy="612.4" r="7.5" fill="#561b13"/><circle cx="245.6" cy="612.5" r="7.5" fill="#551c15"/><circle cx="227.9" cy="630.8" r="7.5" fill="#521b18"/><circle cx="182.5" cy="191.1" r="7.5" fill="#fcc24c"/></g></svg>`;

export const MARK_SHA256 = "af0ddbbf2067227f27491b49d98a0a4acd689973c0dc3fdc79be6bbd31eccd00";

/**
 * The cover's lighting of the mark, in the cover's own units (a 1200 x 630
 * plate). `transform` places the mark on the plate (its visible nodes, 512
 * units tall, at 540, centred); `square` is the plate's central square, x,
 * y and side, which the subject sits in. `route` is the lit route as the
 * mark's node indices, from the lowest node to the top of the flame.
 */
export const COVER = {
  square: [285, 0, 630],
  transform: "translate(600 315) scale(1.05469) translate(-228.25 -382.30)",
  plate: "#0B0E10",
  grid: { size: 30, y: 15, path: "M0 .5H30M.5 0V30", stroke: "#242C33" },
  // The grid fades out from the centre of the plate.
  fade: { cx: 600, cy: 315, r: 640, stops: [[0, "#fff", 0.95], [0.6, "#fff", 0.55], [1, "#fff", 0]] },
  route: [18, 16, 13, 10, 9, 6, 3, 1, 34, 0],
  // The glow behind each node of the route.
  glow: { r: 34, stops: [[0, "#FFD36B", 0.62], [0.42, "#FFB347", 0.24], [1, "#FF9A2A", 0]] },
  // The translucent plate over the mark, feathered at its edge, with a soft
  // hole at each node of the route.
  dim: {
    rect: [70, 95, 320, 590],
    fill: "#0B0E10",
    opacity: 0.22,
    show: [100, 115, 260, 550, "#fff"],
    feather: 14,
    hole: { r: 30, stops: [[0, "#000"], [0.55, "#000", 0.7], [1, "#000", 0]] },
  },
  // The route's stroke: orange at its lowest node to pale gold at the top,
  // kept off the route's node discs so each keeps the mark's own colour.
  climb: { width: 6, stops: [[0, "#FF9F3A"], [1, "#FFF3C9"]] },
  discs: { rect: [90, 100, 280, 580, "#fff"], r: 8.4, fill: "#000" },
};
