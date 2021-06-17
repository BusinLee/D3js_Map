import { Component, Input, OnInit } from '@angular/core';
import { FeatureInfo } from 'src/app/models/feature-info.model';

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit {

  @Input() featureInfo: FeatureInfo;
  
  constructor() { }

  ngOnInit(): void {
  }

}
