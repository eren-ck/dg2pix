/* global d3 */

/**
 * Zoom view as a JS class
 * @author Eren Cakmak eren.cakmak@uni-konstanz.de
 */
import { pixelVis } from './app.js';

const margin = { top: 10, right: 30, bottom: 10, left: 0 };

/**
 * Class for the zoom navigator
 */
export class ZoomNavigator {
  /**
   * Constructor for the level class
   * @param {svg} g svg group to add the pixel vis
   * @param {Number} width width of the group element
   * @param {Number} height height of the group element
   * @param {Object} metaData Meta information
   * @param {Array} data zoom level embedding
   */
  constructor(g, width, height, metaData, data) {
    this._svg = g;
    this._width = width - margin['right'] - margin['left'];
    this._height = height - margin['top'] - margin['bottom'];
    this._metaData = metaData;
    this._data = data['data'];
    this._time = data['time'];

    // append the g for the group
    this._g = this._svg
      .append('g')
      .attr('class', 'zoom-vis')
      .attr(
        'transform',
        'translate(' + margin['left'] + ', ' + margin['top'] + ')'
      );

    // append the def patterns
    this._g
      .append('defs')
      .append('pattern')
      .attr('id', 'pattern-stripe')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('patternTransform', 'rotate(60)')
      .attr('width', 4)
      .attr('height', 4)
      .append('rect')
      .attr('width', 2)
      .attr('height', 4)
      .attr('transform', 'translate(0,0)')
      .attr('fill', '#3b75b5');

    this._g
      .append('rect')
      .attr('id', 'nav-rect-background')
      .attr('y', 0)
      .attr('x', 0)
      .attr('height', this._height)
      .attr('width', this._width);
  }

  /**
   * Draw the zoom navigator vis
   */
  draw() {
    const that = this;

    const maxLevel = this._metaData['height'];

    let rectWidth =
      Math.floor(this._width / this._data.length) > 0
        ? Math.floor(this._width / this._data.length)
        : 1;

    const xScale = d3
      .scaleLinear()
      .domain([0, this._data.length])
      .range([0, this._width]);

    const yScale = d3
      .scaleLinear()
      .domain([maxLevel, 1])
      .range([0, this._height]);

    // brush stuff
    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [this._width, this._height],
      ])
      .on('end', function() {
        if (!d3.event.selection) {
          that._g.call(brush.move, xScale.range());
          pixelVis.xScale(xScale);
        }

        // compute new scale
        const selection = d3.event.selection;
        const newXScale = xScale
          .copy()
          .domain(selection.map((d) => xScale.invert(d)));

        if (pixelVis) {
          pixelVis.xScale(newXScale);
        }
      });

    this._g.call(brush).call(brush.move, xScale.range());

    const cells = this._g.selectAll('.zoom-rect').data(this._data);

    // ENTER add rects
    cells
      .enter()
      .append('rect')
      .merge(cells)
      .attr('class', 'zoom-rect')
      .attr('time-1', function(d, i) {
        return that._time[i][0];
      })
      .attr('time-2', function(d, i) {
        return that._time[i][1];
      })
      .attr('id', function(d, i) {
        return 'zoom-rect-' + i;
      })
      .on('mouseover', function(d, i) {
        d3.select('#tooltip')
          .style('left', that._width / 2 + 'px')
          .style('top', '-40px')
          .classed('hide', false)
          .select('p')
          .html(
            'Level:' +
              d +
              '<br /> Start: ' +
              that._time[i][0] +
              '- End: ' +
              that._time[i][1] +
              '<br />  Window-size: ' +
              Math.pow(2, d - 1)
          );

        d3.select('.col-g[position="' + i + '"]').classed('highlighted', true);
        d3.select('#zoom-rect-' + i).classed('highlighted', true);
      })
      .on('mouseout', function(d, i) {
        d3.select('#tooltip').classed('hide', true);
        d3.select('.col-g[position="' + i + '"]').classed('highlighted', false);
        d3.select('#zoom-rect-' + i).classed('highlighted', false);
      })
      .transition()
      .delay(function(d, i) {
        return i * 10;
      })
      .attr('width', rectWidth)
      .attr('height', function(d) {
        return yScale(maxLevel - d);
      })
      .attr('x', function(d, i) {
        return xScale(i);
      })
      .attr('y', function(d) {
        return yScale(d);
      })
      .style('fill', 'url(#pattern-stripe)');

    // EXIT cells
    cells.exit().remove();

    // append the lines
    const lines = this._g.selectAll('.zoom-line').data(this._data);

    // ENTER add lines
    lines
      .enter()
      .append('line')
      .merge(lines)
      .attr('class', 'zoom-line')
      .transition()
      .delay(function(d, i) {
        return i * 10;
      })
      .attr('x1', function(d, i) {
        return xScale(i);
      })
      .attr('x2', function(d, i) {
        return xScale(i) + rectWidth;
      })
      .attr('y1', function(d) {
        return yScale(d);
      })
      .attr('y2', function(d) {
        return yScale(d);
      });

    // EXIT cells
    lines.exit().remove();
  }

  /**
   * SETTER AND GETTER
   */

  /**
   * Get the height of the cell
   */
  set data(data) {
    this._data = data['data'];
    this._time = data['time'];
  }
}
