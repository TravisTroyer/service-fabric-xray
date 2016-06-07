﻿import {Component, OnInit, OnDestroy, ElementRef, ViewChild} from 'angular2/core';
import {Observable, Subscription}     from "rxjs/rx";
import {NodeComponent} from './node.component';
import {Selectable} from './../viewmodels/selectable';
import {NodeViewModel} from './../viewmodels/nodeviewmodel';
import {NodeCapacityViewModel} from './../viewmodels/nodecapacityviewmodel';
import {ClusterCapacityViewModel} from './../viewmodels/clustercapacityviewmodel';
import {List} from './../viewmodels/list';

import {DataService} from './../services/data.service';

@Component({
    selector: 'cluster-component',
    templateUrl: 'app/components/cluster.component.html',
    styleUrls: ['app/components/cluster.component.css'],
    directives: [NodeComponent]
})

export class ClusterComponent implements OnInit, OnDestroy {

    private DefaultCapacitySize: number = 500;

    @ViewChild("container")
    protected container: ElementRef;

    private selectedColors: string = 'status';
    private selectedMetricName: string = "Count";
    private selectedClusterCapacity: ClusterCapacityViewModel;
    private selectedNodeTypes: Selectable[];
    private selectedApplicationTypes: Selectable[];

    private nodes: NodeViewModel[];
    private clusterCapacities: ClusterCapacityViewModel[];

    private applicationsExpanded: boolean;
    private servicesExpanded: boolean;
    private scaleFactor: number;

    private nodeSubscription: Subscription;
    private clusterInfoSubscription: Subscription;
    private clusterSubscription: Subscription;

    constructor(
        private dataService: DataService )
    {
        this.scaleFactor = 1;
        this.applicationsExpanded = true;
        this.servicesExpanded = true;
        this.nodes = [];
        this.selectedNodeTypes = [];
        this.selectedApplicationTypes = [];
        this.clusterCapacities = [];
    }
    
    public ngOnInit(): void {
        this.nodeSubscription = this.dataService.getNodes(() => this.selectedNodeTypes.length > 0 ? this.selectedNodeTypes.filter(x => !x.selected).map(x => x.name) : null).subscribe(
            result => {
                if (!result) {
                    return;
                }

                List.updateList(this.nodes, result.map(x =>
                    new NodeViewModel(
                        x.name,
                        x.nodeType,
                        x.status.toLowerCase(),
                        x.healthState.toLowerCase(),
                        x.upTime,
                        x.address,
                        x.faultDomain,
                        x.upgradeDomain,
                        true,
                        true)));
            },
            error => console.log("error from observable: " + error));

        this.clusterInfoSubscription = this.dataService.getClusterFilters().subscribe(
            result => {
                if (!result) {
                    return;
                }

                List.updateList(this.selectedNodeTypes, result.nodeTypes.map(x => new Selectable(x, true)));
                List.updateList(this.selectedApplicationTypes, result.applicationTypes.map(x => new Selectable(x, true)));
            },
            error => console.log("error from observable: " + error));


        this.clusterSubscription = this.dataService.getClusterCapacity().subscribe(
            result => {
                if (!result) {
                    return;
                }

                List.updateList(this.clusterCapacities, result.map(x =>
                    new ClusterCapacityViewModel(
                        x.bufferedCapacity,
                        x.capacity,
                        x.load,
                        x.remainingBufferedCapacity,
                        x.remainingCapacity,
                        x.isClusterCapacityViolation,
                        x.name,
                        x.bufferPercentage,
                        x.balancedBefore,
                        x.balancedAfter,
                        x.deviationBefore,
                        x.deviationAfter,
                        x.balancingThreshold,
                        x.maxLoadedNode,
                        x.minLoadedNode,
                        true
                    )));
                
                this.selectedClusterCapacity = this.clusterCapacities.find(x => x.name == this.selectedMetricName);
            },
            error => console.log("error from observable: " + error));
    }

    public ngOnDestroy(): void {
        if (this.clusterInfoSubscription) {
            this.clusterInfoSubscription.unsubscribe();
        }

        if (this.nodeSubscription) {
            this.nodeSubscription.unsubscribe();
        }

        if (this.clusterSubscription) {
            this.clusterSubscription.unsubscribe();
        }
    }

    private onChangeCapacity(newValue: string): void {
        this.selectedMetricName = newValue.split(":")[1].trim(); // yeah this is weird but that's what angular gives us.
        this.selectedClusterCapacity = this.clusterCapacities.find(x => x.name == this.selectedMetricName);
    }

    private onChangeColors(newValue): void {
        this.selectedColors = newValue;
    }

    private onSelectNodeType(nodeType: string, event): void {

        // Deselecting a node type will remove it from the data stream,
        // but that takes a few seconds to update.
        // This removes it from the list immediately to make the UI more responsive.
        let isChecked: boolean = event.currentTarget.checked;

        if (!isChecked) {

            let ix: number = -1;
            while((ix = this.nodes.findIndex(x => x.nodeType == nodeType)) >= 0)
            {
                this.nodes.splice(ix, 1);
            }
        }
    }

    private expandApplications(): void {
        this.applicationsExpanded = !this.applicationsExpanded;

        for (var node of this.nodes) {
            node.applicationsExpanded = this.applicationsExpanded;
        }
    }

    private expandServices(): void {
        this.servicesExpanded = !this.servicesExpanded;

        for (var node of this.nodes) {
            node.servicesExpanded = this.servicesExpanded;
        }
    }
}
