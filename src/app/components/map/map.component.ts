import { Component, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { FeatureCollection } from 'geojson';
import { FeatureInfo } from 'src/app/models/feature-info.model';
import * as t from "topojson-client";

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss']
})
export class MapComponent implements OnInit {

  width = 960;
  height = 700;
  projection: any;
  path: any;
  svg: any;
  g: any;
  tooltip: any;
  quantile: any;
  featureInfo: FeatureInfo;
  isLoading: boolean;

  constructor() {}

  ngOnInit(): void {
    this.featureInfo = new FeatureInfo();
    this.isLoading = true;

    this.tooltip = d3.select('#map-canvas').append('div')
    .attr('class', 'tooltip')
    .style('opacity', 0);

    d3.csv('assets/vn_population.csv').then( (data) => {
      this.loadTopoJson(data);
    })

  }

  loadTopoJson(data: any) {
    d3.json('assets/vn_states.json').then( (topology: any) => {
      this.isLoading = false;
      let features = (t.feature(topology, topology.objects.states) as unknown as FeatureCollection).features

      for (let i = 0; i < data.length; i++) {
        let dataIso = data[i].iso;
        let density = parseFloat(data[i].density);
        let population = parseFloat(data[i].population);
        let area = parseFloat(data[i].area);
  
      //Find the corresponding state inside the GeoJSON
        for (let j = 0; j < features.length; j++) {
          let jsonIso = features[j].properties!.iso;
          if (dataIso == jsonIso) {
            // Copy the data value into the JSON
            features[j].properties!.density = density;
            features[j].properties!.population = population;
            features[j].properties!.area = area;
            break;
          }
        }
      }
      this.quantile = d3.scaleQuantile()
            .domain(features.map(function(d) {
              return d.properties!.density;
            }))
            .range([0,1,2,3,4,5,6,7,8])
      this.drawMap(topology, features);
    });
  };

  drawMap(json: any, features: any) {
    this.projection = d3.geoMercator()
    .translate([this.width / 2, this.height / 2 - 30])
      .scale(2500)
      .center([106.34899620666437, 16.553160650957434]);
  
    this.path = d3.geoPath()
      .projection(this.projection);
  
    this.svg = d3.select('#map-canvas').append('svg')
      .attr('width', this.width)
      .attr('height', this.height);
  
    this.g = this.svg.append('g');
  
    // Boundary
    var boundary = this.g.append('g')
      .attr('class', 'boundary');
  
    this.g.attr('class', 'states')
      .selectAll('path') 
      .data(features)
      .enter().append('g')
      .attr('class', function(d: any) {
        return 'state state-' + d.properties.iso;
      })
      .on('mouseover', (event: any, d: any) => {
        this.tooltip.transition().duration(300)
          .style('opacity', 1);

        this.tooltip.text(d.properties.name)
          .style('left', event.screenX + 'px')
          .style('top', (event.screenY - 90) + 'px');

        this.featureInfo.name = d.properties.name;
        this.featureInfo.population = d.properties.population;
        this.featureInfo.area = d.properties.area;
        this.featureInfo.density = d.properties.density;
        this.featureInfo.capital = d.properties.capital;
  
      })
      .on('mouseout', (d: any) => {
        this.tooltip.transition().duration(300)
          .style('opacity', 0);
          this.featureInfo = new FeatureInfo();
      })
      .append('path')
      .attr('class', (d: any) => {
        return 'feature ' + 'q' + this.quantile(d.properties.density) + '-9';
      })
      .attr('d', this.path);
  
    // Country boundary from merge all geometries
    boundary.append('path')
      .attr('class', 'country-boundary')
      .datum(t.merge(json, json.objects.states.geometries))
      .attr('d', this.path);
  
    // State mesh
    boundary.append('path')
      .attr('class', 'state-boundary')
      .datum(t.mesh(json, json.objects.states, function(a, b) {
        return a !== b;
      })).attr('d', this.path);
      
    // State names
    this.g.append('g')
      .attr('class', 'state-labels')
      .selectAll('text')
      .data(features)
      .enter().append('text')
      .attr('class', (d: any) => {
        var className = 'state-label state-' + d.properties.iso;
        return className + ' ' + 'q' + this.quantile(d.properties.density) + '-9';
      })
      .text(function(d: any) {
        return d.properties.name;
      })
      // Using transform equivalent to x, y
      .attr('transform', (d: any) => {
        return 'translate(' + this.path.centroid(d) + ')';
      })
      .attr('dy', '.35em');
    d3.select(self.frameElement).style('height', this.height + 'px');
  }
}
