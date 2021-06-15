var width = 960
var height = 700;
var active = d3.select(null);
var zoomScale, zoomTranslate;

// classes (q0-9, q1-9 ... q8-9)
var quantiles = d3.scale.quantile()
  .range(d3.range(9).map(function(i) {
    return 'q' + i + '-9';
  }));

var svg, g, path, zoom, projection, tooltip, scatterplot;

$(document).ready(function() {
  d3.select('#loading').classed('hidden', false);

  tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0)
    .on('click', stopped, true);

  d3.csv('vn_population.csv', function(error, rows) {
    if (error) {
      return console.warn(error);
    }

    loadTopoJson(rows);
  });
});

function loadTopoJson(data) {
  d3.json('vn_states.json', function(error, json) {

    if (error) {
      return console.warn(error);
    }

    d3.select('#loading').classed('hidden', true);
    var features = topojson.feature(json, json.objects.states).features;
    for (var i = 0; i < data.length; i++) {
      var dataIso = data[i].iso;
      var density = parseFloat(data[i].density);
      var population = parseFloat(data[i].population);
      var area = parseFloat(data[i].area);

      //Find the corresponding state inside the GeoJSON
      for (var j = 0; j < features.length; j++) {

        var jsonIso = features[j].properties.iso;
        if (dataIso == jsonIso) {
          // Copy the data value into the JSON
          features[j].properties.density = density;
          features[j].properties.population = population;
          features[j].properties.area = area;
          break;
        }
      }
    }

    // Set the domain of the values
    quantiles.domain(features.map(function(d) {
      return d.properties.density;
    }));

    var legend = d3.select('.bar-legend').append('svg')
      .attr('width', 240)
      .attr('height', 12);

    legend.selectAll('rect')
      .data(d3.range(9).map(function(i) {
        return 'q' + i + '-9';
      }))
      .enter().append('rect')
      .attr('width', 240 / 9)
      .attr('height', 12)
      .attr('x', function(d, i) {
        return (240 / 9) * i;
      })
      .attr('data-level', function(d, i) {
        return i;
      })
      .attr('class', function(d) {
        return 'legend ' + d;
      }).on('mouseover', function(type) {
        d3.selectAll('.legend')
          .style('opacity', .3);
        d3.select(this)
          .style('opacity', 1);

        var level = d3.select(this).attr('data-level');

        d3.selectAll('.feature')
          .style('opacity', .1)
          .filter('.q' + level + '-9')
          .style('opacity', 1);

        d3.selectAll('.bubble')
          .style('fill-opacity', .1)
          .filter('.q' + level + '-9')
          .style('fill-opacity', .75);

        d3.selectAll('.state-boundary')
          .style('stroke-opacity', .3);
      })
      .on('mouseout', function(type) {
        d3.selectAll('.legend')
          .style('opacity', 1);
        d3.selectAll('.feature')
          .style('opacity', 1);
        d3.selectAll('.bubble')
          .style('fill-opacity', .75);

        d3.selectAll('.state-boundary')
          .style('stroke-opacity', 1);
      });

    drawMap(json, features);
    drawScatterplot(features);
  });
};

function drawScatterplot(data) {
  var margin = {
    top: 20,
    right: 10,
    bottom: 80,
    left: 40
  };
  var w = 270 - margin.left - margin.right;
  var h = 270 - margin.top - margin.bottom;

  var scatter = d3.select('.scatterplot-wrapper')
    .append('svg')
    .attr('width', w + margin.left + margin.right)
    .attr('height', h + margin.top + margin.bottom)
    .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

  /// Population (x)
  var xscale = d3.scale.linear()
    .domain([d3.min(data, function(d) {
        return d.properties.population;
      }),
      d3.max(data, function(d) {
        return d.properties.population;
      })
    ])
    .range([0, w]);

  // Area (y)
  var yscale = d3.scale.linear()
    .domain([d3.min(data, function(d) {
        return d.properties.area / 1000;
      }),
      d3.max(data, function(d) {
        return d.properties.area / 1000;
      })
    ])
    .range([h, 0]);

  var rscale = d3.scale.sqrt()
    .domain([d3.min(data, function(d) {
        return d.properties.density;
      }),
      d3.max(data, function(d) {
        return d.properties.density;
      })
    ])
    .range([3, 15]);

  // Define X axis
  var xaxis = d3.svg.axis()
    .scale(xscale)
    .orient('bottom')
    .tickSize(-h)
    .tickFormat(d3.format('s'));

  // Define Y axis
  var yaxis = d3.svg.axis()
    .scale(yscale)
    .orient('left')
    .ticks(6)
    .tickSize(-w);

  // Create X axis
  scatter.append('g')
    .attr('class', 'x-axis axis')
    .attr('transform', 'translate(0,' + (h) + ')')
    .call(xaxis);

  // Create Y axis
  scatter.append('g')
    .attr('class', 'y-axis axis')
    .attr('transform', 'translate(' + 0 + ',0)')
    .call(yaxis);

  // Add label to X axis
  scatter.append('text')
    .attr('class', 'x label')
    .attr('text-anchor', 'middle')
    .attr('x', w - w / 2)
    .attr('y', h + margin.bottom / 2)
    .text('Population');

  // Add label to Y axis
  scatter.append('text')
    .attr('class', 'y label')
    .attr('text-anchor', 'middle')
    .attr('y', -margin.left + 5)
    .attr('x', 0 - (h / 2))
    .attr('dy', '1em')
    .attr('transform', 'rotate(-90)')
    .text('Area (1000 km2)');

  var clr = d3.scale.category20();

  var circles = scatter.selectAll('circle')
    .data(data).enter()
    .append('circle')
    .attr('cx', function(d) {
      return xscale(d.properties.population);
    })
    .attr('cy', function(d) {
      return yscale(d.properties.area / 1000);
    })
    .attr('r', function(d) {
      return rscale(d.properties.density);
    })
    .attr('class', function(d) {
      return 'bubble state-' + d.properties.iso + ' ' +
        quantiles(d.properties.density);
    })
    .on('mouseover', function(d) {
      tooltip.transition().duration(300)
        .style('opacity', 1);

      tooltip.text(d.properties.name)
        .style('left', d3.event.pageX + 'px')
        .style('top', (d3.event.pageY - 50) + 'px');
    }).on('mouseout', function(d) {
      tooltip.transition().duration(300)
        .style('opacity', 0);
    });
}

function drawMap(json, features) {
  var center = [106.34899620666437, 16.553160650957434];
  var scale = 2500;
  var offset = [width / 2, height / 2 - 50];

  projection = d3.geo.mercator()
    .translate(offset)
    .scale([scale])
    .center(center);

  path = d3.geo.path()
    .projection(projection);

  zoom = d3.behavior.zoom()
    .translate([0, 0])
    .scale(1)
    .scaleExtent([1, 13])
    .on('zoom', zoomed);

  svg = d3.select('#map-canvas').append('svg')
    .attr('width', width)
    .attr('height', height)
    .on('click', stopped, true);

  svg.append('rect')
    .attr('class', 'overlay')
    .attr('width', width)
    .attr('height', height)
    .on('click', function() {
      zoomScale = 1;
      zoomTranslate = [0, 0];

      reset();
    }, true);

  g = svg.append('g');

  // Create g before call zoom
  svg.call(zoom)
    .call(zoom.event)
    .on('dblclick.zoom', null);

  // Boundary
  var boundary = g.append('g')
    .attr('class', 'boundary');

  g.attr('class', 'states')
    .selectAll('path') 
    .data(features)
    .enter().append('g')
    .attr('class', function(d) {
      return 'state state-' + d.properties.iso;
    })
    .on('mouseover', function(d) {
      tooltip.transition().duration(300)
        .style('opacity', 1);

      tooltip.text(d.properties.name)
        .style('left', d3.event.pageX + 'px')
        .style('top', (d3.event.pageY - 50) + 'px');
      $('#feature-info').find('tr:gt(0)').remove();

      var html = '<tr><td>' + d.properties.name + '</td>' +
        '<td>' + d.properties.population.toFixed(2) + '</td>' +
        '<td>' + d.properties.area.toFixed(2) + '</td>' +
        '<td>' + d.properties.density.toFixed(2) + '</td>' +
        '<td>' + d.properties.capital + '</td></tr>';
      $('#feature-info tr:last').after(html);

      d3.selectAll('.bubble')
        .style('fill-opacity', .1)
        .filter('.state-' + d.properties.iso)
        .classed('highlight', true);
    })
    .on('mouseout', function(d) {
      tooltip.transition().duration(300)
        .style('opacity', 0);

      $('#feature-info').find('tr:gt(0)').remove();

      d3.selectAll('.bubble')
        .style('fill-opacity', .75)
        .classed('highlight', false);
    })
    .on('click', clicked)
    .append('path')
    .attr('class', function(d) {
      // Use the quantiled value for the class
      return 'feature ' + quantiles(d.properties.density);
    })
    .attr('d', path);

  // Country boundary from merge all geometries
  boundary.append('path')
    .attr('class', 'country-boundary')
    .datum(topojson.merge(json, json.objects.states.geometries))
    .attr('d', path);

  // State mesh
  boundary.append('path')
    .attr('class', 'state-boundary')
    .datum(topojson.mesh(json, json.objects.states, function(a, b) {
      return a !== b;
    })).attr('d', path);
    
  // State names
  g.append('g')
    .attr('class', 'state-labels')
    .selectAll('text')
    .data(features)
    .enter().append('text')
    .attr('class', function(d) {
      var className = 'state-label state-' + d.properties.iso;
      return className + ' ' + quantiles(d.properties.density);
    })
    .text(function(d) {
      return d.properties.name;
    })
    // Using transform equivalent to x, y
    .attr('transform', function(d) {
      return 'translate(' + path.centroid(d) + ')';
    })
    .attr('dy', '.35em');

  drawCities();

  d3.select(self.frameElement).style('height', height + 'px');
}

function drawCities() {
  // Cities group
  g.append('g')
    .attr('class', 'cities');

  d3.csv('vn_cities.csv', function(error, rows) {
    if (error) {
      return console.warn(error);
    }

    rows.forEach(function(row, i) {
      // Create new group and binding data
      var sg = g.selectAll('.cities')
        .append('g').datum(row)
        .attr('class', function(d) {
          return 'city city-' + d.code + ' level-' + d.level;
        });

      // Append circle to group of city
      sg.append('circle')
        .attr('class', function(d) {
          return 'city-place';
        })
        .attr('visibility', function(d) {
          return d.level < 3 ? 'visible' : 'hidden';
        })
        .attr('cx', function(d) {
          return projection([d.lng, d.lat])[0];
        })
        .attr('cy', function(d) {
          return projection([d.lng, d.lat])[1];
        })
        .attr('r', 2)
        .style('fill', 'white')
        .style('stroke', 'black')
        .style('stroke-width', 2)
        .style('opacity', 0.85);

      sg.append('text')
        .attr('class', function(d) {
          return 'city-label';
        })
        .text(function(d) {
          return d.name;
        })
        .attr('visibility', function(d) {
          return d.level < 2 ? 'visible' : 'hidden';
        })
        .attr('x', function(d) {
          return projection([d.lng, d.lat])[0];
        })
        .attr('y', function(d) {
          return projection([d.lng, d.lat])[1];
        })
        .attr('text-anchor', function(d) {
          return d.lng > 105.7 ? 'start' : 'end';
        })
        .attr('dx', function(d) {
          return (d.lng > 105.7 ? 1 : -1) * 0.7 + 'em';
        })
        .attr('dy', '.35em');
    });
  });
}

function zoomed() {
  g.selectAll('.country-boundary').style('stroke-width', 1 / d3.event.scale + 'px');

  g.selectAll('.feature').style('stroke-width', 2 / (d3.event.scale + 0.5) + 'px');
  g.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');

  g.selectAll('.state-label').style('font-size', (8 / d3.event.scale + 2) + 'px')

  g.selectAll('.city-place')
    .style('r', 1 / d3.event.scale + 0.7)
    .style('stroke-width', 2 / (d3.event.scale + 0.5) + 'px');

  g.selectAll('.city-label')
    .style('font-size', (12 / d3.event.scale + 1.5) + 'px')
    .attr('dy', d3.event.scale == 1 ? '0.35em' : (((1 / d3.event.scale) * 0.35 + 0.2) + 'em'));

  g.selectAll('.level-3 .city-label')
    .style('font-size', (6 / d3.event.scale + 1.5) + 'px');

  g.selectAll('.level-4 .city-label')
    .style('font-size', (5 / d3.event.scale + 1.5) + 'px');

  if (d3.event.scale < 2) {
    g.selectAll('.level-2 .city-label').attr('visibility', 'hidden');
  } else {
    g.selectAll('.level-2 .city-label').attr('visibility', 'visible');
  }

  if (d3.event.scale < 3.3) {
    g.selectAll('.level-3 .city-label').attr('visibility', 'hidden');
    g.selectAll('.level-3 .city-place').attr('visibility', 'hidden');

    g.selectAll('.level-4 .city-label').attr('visibility', 'hidden');
    g.selectAll('.level-4 .city-place').attr('visibility', 'hidden');
  } else {
    g.selectAll('.level-3 .city-label').attr('visibility', 'visible');
    g.selectAll('.level-3 .city-place').attr('visibility', 'visible');

    g.selectAll('.level-4 .city-label').attr('visibility', 'visible');
    g.selectAll('.level-4 .city-place').attr('visibility', 'visible');
  }
}

function stopped() {
  if (d3.event.defaultPrevented) {
    d3.event.stopPropagation();
  }
}

function reset() {
  active.classed('active', false);
  active = d3.select(null);

  zoomScale = zoomScale || 1;
  zoomTranslate = zoomTranslate || [0, 0];

  svg.transition()
    .duration(750)
    .call(zoom.translate(zoomTranslate).scale(zoomScale).event);
}

function clicked(d) {
  if (active.node() === this) {
    return reset();
  }

  active.classed('active', false);
  active = d3.select(this).classed('active', true);

  // Save current zoom and translate
  zoomScale = zoom.scale();
  zoomTranslate = zoom.translate();

  var bounds = path.bounds(d),
    dx = bounds[1][0] - bounds[0][0],
    dy = bounds[1][1] - bounds[0][1],
    x = (bounds[0][0] + bounds[1][0]) / 2,
    y = (bounds[0][1] + bounds[1][1]) / 2,
    scale = Math.max(1, Math.min(8, 0.9 / Math.max(dx / width, dy / height))),
    translate = [width / 2 - scale * x, height / 2 - scale * y];

  svg.transition()
    .duration(750)
    .call(zoom.translate(translate).scale(scale).event);
}
