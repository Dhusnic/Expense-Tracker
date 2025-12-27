import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  GridsterConfig, 
  GridsterItem,
  // GridsterItem,
  GridsterItemConfig 
} from 'angular-gridster2';
import { NgxEchartsModule, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, GaugeChart, ScatterChart } from 'echarts/charts';
import { 
  TitleComponent, 
  TooltipComponent, 
  GridComponent, 
  LegendComponent,
  DatasetComponent,
  TransformComponent 
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { Subject } from 'rxjs';

// Register ECharts components
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GaugeChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DatasetComponent,
  TransformComponent,
  CanvasRenderer
]);

interface Dashboard {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// Use GridsterItemConfig instead of GridsterItem
interface Widget extends GridsterItemConfig {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'gauge' | 'scatter' | 'custom';
  chartOptions?: any;
  data?: any;
}

@Component({
  selector: 'app-dashboard-grid',
  standalone: true,
  imports: [CommonModule, NgxEchartsModule],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './dashboard-grid.html',
  styleUrl: './dashboard-grid.scss'
})
export class DashboardGrid implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Sidebar state
  sidebarExpanded = signal<boolean>(true);
  sidebarWidth = computed(() => this.sidebarExpanded() ? '280px' : '70px');

  // Dashboards list
  dashboards = signal<Dashboard[]>([
    {
      id: 'analytics',
      name: 'Analytics Dashboard',
      icon: 'bi-graph-up',
      description: 'Sales and revenue analytics'
    },
    {
      id: 'operations',
      name: 'Operations',
      icon: 'bi-gear-fill',
      description: 'Operational metrics and KPIs'
    },
    {
      id: 'monitoring',
      name: 'System Monitoring',
      icon: 'bi-cpu-fill',
      description: 'Server and application monitoring'
    },
    {
      id: 'reports',
      name: 'Reports',
      icon: 'bi-file-earmark-bar-graph',
      description: 'Custom reports and insights'
    }
  ]);

  activeDashboard = signal<string>('analytics');

  // Gridster configuration
  gridsterOptions: GridsterConfig = {};
  widgets = signal<Widget[]>([]);

  // ECharts instance tracking
  chartInstances = new Map<string, any>();

  ngOnInit(): void {
    this.initializeGridster();
    this.loadDashboardWidgets(this.activeDashboard());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.chartInstances.clear();
  }

  /**
   * Initialize Gridster configuration
   */
  private initializeGridster(): void {
    this.gridsterOptions = {
      gridType: 'fit',
      compactType: 'none',
      margin: 16,
      outerMargin: true,
      outerMarginTop: null,
      outerMarginRight: null,
      outerMarginBottom: null,
      outerMarginLeft: null,
      useTransformPositioning: true,
      mobileBreakpoint: 640,
      minCols: 12,
      maxCols: 12,
      minRows: 12,
      maxRows: 100,
      maxItemCols: 12,
      minItemCols: 1,
      maxItemRows: 100,
      minItemRows: 1,
      maxItemArea: 2500,
      minItemArea: 1,
      defaultItemCols: 4,
      defaultItemRows: 3,
      fixedColWidth: 105,
      fixedRowHeight: 105,
      keepFixedHeightInMobile: false,
      keepFixedWidthInMobile: false,
      scrollSensitivity: 10,
      scrollSpeed: 20,
      enableEmptyCellClick: false,
      enableEmptyCellContextMenu: false,
      enableEmptyCellDrop: false,
      enableEmptyCellDrag: false,
      enableOccupiedCellDrop: false,
      emptyCellDragMaxCols: 50,
      emptyCellDragMaxRows: 50,
      ignoreMarginInRow: false,
      draggable: {
        enabled: true,
        ignoreContent: true,
        dragHandleClass: 'drag-handle'
      },
      resizable: {
        enabled: true
      },
      swap: true,
      pushItems: true,
      disablePushOnDrag: false,
      disablePushOnResize: false,
      pushDirections: { north: true, east: true, south: true, west: true },
      pushResizeItems: false,
      displayGrid: 'onDrag&Resize',
      disableWindowResize: false,
      disableWarnings: false,
      scrollToNewItems: false,
      itemChangeCallback: this.itemChange.bind(this),
      itemResizeCallback: this.itemResize.bind(this)
    };
  }

  /**
   * Load widgets for selected dashboard
   */
  private loadDashboardWidgets(dashboardId: string): void {
    const dashboardWidgets: Record<string, Widget[]> = {
      analytics: this.getAnalyticsWidgets(),
      operations: this.getOperationsWidgets(),
      monitoring: this.getMonitoringWidgets(),
      reports: this.getReportsWidgets()
    };

    this.widgets.set(dashboardWidgets[dashboardId] || []);
  }

  /**
   * Analytics dashboard widgets
   */
  private getAnalyticsWidgets(): Widget[] {
    return [
      {
        id: 'revenue-chart',
        cols: 6,
        rows: 4,
        y: 0,
        x: 0,
        title: 'Monthly Revenue',
        type: 'bar',
        chartOptions: {
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' }
          },
          legend: { data: ['Revenue', 'Profit'] },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            data: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
          },
          yAxis: { type: 'value' },
          series: [
            {
              name: 'Revenue',
              type: 'bar',
              data: [120, 200, 150, 80, 70, 110, 130, 180, 160, 190, 210, 250],
              itemStyle: { color: '#667eea' }
            },
            {
              name: 'Profit',
              type: 'bar',
              data: [80, 120, 100, 50, 40, 70, 90, 120, 110, 130, 150, 180],
              itemStyle: { color: '#764ba2' }
            }
          ]
        }
      },
      {
        id: 'sales-trend',
        cols: 6,
        rows: 4,
        y: 0,
        x: 6,
        title: 'Sales Trend',
        type: 'line',
        chartOptions: {
          tooltip: { trigger: 'axis' },
          legend: { data: ['Sales', 'Target'] },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: ['Week 1', 'Week 2', 'Week 3', 'Week 4']
          },
          yAxis: { type: 'value' },
          series: [
            {
              name: 'Sales',
              type: 'line',
              smooth: true,
              data: [150, 230, 224, 318],
              itemStyle: { color: '#667eea' },
              areaStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: 'rgba(102, 126, 234, 0.5)' },
                    { offset: 1, color: 'rgba(102, 126, 234, 0.1)' }
                  ]
                }
              }
            },
            {
              name: 'Target',
              type: 'line',
              smooth: true,
              data: [200, 250, 280, 300],
              itemStyle: { color: '#48bb78' },
              lineStyle: { type: 'dashed' }
            }
          ]
        }
      },
      {
        id: 'product-distribution',
        cols: 4,
        rows: 4,
        y: 4,
        x: 0,
        title: 'Product Distribution',
        type: 'pie',
        chartOptions: {
          tooltip: { trigger: 'item' },
          legend: { orient: 'vertical', left: 'left' },
          series: [
            {
              name: 'Products',
              type: 'pie',
              radius: '70%',
              data: [
                { value: 335, name: 'Electronics', itemStyle: { color: '#667eea' } },
                { value: 310, name: 'Clothing', itemStyle: { color: '#764ba2' } },
                { value: 234, name: 'Food', itemStyle: { color: '#48bb78' } },
                { value: 135, name: 'Books', itemStyle: { color: '#ed8936' } },
                { value: 148, name: 'Others', itemStyle: { color: '#4299e1' } }
              ],
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }
          ]
        }
      },
      {
        id: 'conversion-rate',
        cols: 4,
        rows: 4,
        y: 4,
        x: 4,
        title: 'Conversion Rate',
        type: 'gauge',
        chartOptions: {
          series: [
            {
              type: 'gauge',
              startAngle: 180,
              endAngle: 0,
              min: 0,
              max: 100,
              splitNumber: 8,
              axisLine: {
                lineStyle: {
                  width: 6,
                  color: [
                    [0.25, '#FF6E76'],
                    [0.5, '#FDDD60'],
                    [0.75, '#58D9F9'],
                    [1, '#7CFFB2']
                  ]
                }
              },
              pointer: {
                icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                length: '12%',
                width: 20,
                offsetCenter: [0, '-60%'],
                itemStyle: { color: 'auto' }
              },
              axisTick: { length: 12, lineStyle: { color: 'auto', width: 2 } },
              splitLine: { length: 20, lineStyle: { color: 'auto', width: 5 } },
              axisLabel: {
                color: '#464646',
                fontSize: 14,
                distance: -60,
                formatter: function (value: number) {
                  return value + '%';
                }
              },
              title: { offsetCenter: [0, '-20%'], fontSize: 18 },
              detail: {
                fontSize: 30,
                offsetCenter: [0, '0%'],
                valueAnimation: true,
                formatter: function (value: number) {
                  return value + '%';
                },
                color: 'auto'
              },
              data: [{ value: 72.5, name: 'Conversion' }]
            }
          ]
        }
      },
      {
        id: 'customer-analytics',
        cols: 4,
        rows: 4,
        y: 4,
        x: 8,
        title: 'Customer Analytics',
        type: 'scatter',
        chartOptions: {
          tooltip: { trigger: 'item' },
          xAxis: { name: 'Purchases', type: 'value' },
          yAxis: { name: 'Satisfaction', type: 'value' },
          series: [
            {
              name: 'Customers',
              type: 'scatter',
              symbolSize: 20,
              data: [
                [10, 8.04],
                [8, 6.95],
                [13, 7.58],
                [9, 8.81],
                [11, 8.33],
                [14, 9.96],
                [6, 7.24],
                [4, 4.26],
                [12, 10.84],
                [7, 4.82],
                [5, 5.68]
              ],
              itemStyle: { color: '#667eea' }
            }
          ]
        }
      }
    ];
  }

  /**
   * Operations dashboard widgets
   */
  private getOperationsWidgets(): Widget[] {
    return [
      {
        id: 'task-completion',
        cols: 6,
        rows: 4,
        y: 0,
        x: 0,
        title: 'Task Completion Rate',
        type: 'line',
        chartOptions: {
          tooltip: { trigger: 'axis' },
          legend: { data: ['Completed', 'Pending'] },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          },
          yAxis: { type: 'value' },
          series: [
            {
              name: 'Completed',
              type: 'line',
              data: [45, 52, 48, 67, 71, 65, 58],
              smooth: true,
              itemStyle: { color: '#48bb78' }
            },
            {
              name: 'Pending',
              type: 'line',
              data: [15, 12, 18, 10, 8, 12, 15],
              smooth: true,
              itemStyle: { color: '#f56565' }
            }
          ]
        }
      },
      {
        id: 'resource-utilization',
        cols: 6,
        rows: 4,
        y: 0,
        x: 6,
        title: 'Resource Utilization',
        type: 'bar',
        chartOptions: {
          tooltip: { trigger: 'axis' },
          legend: { data: ['CPU', 'Memory', 'Storage'] },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            data: ['Server 1', 'Server 2', 'Server 3', 'Server 4']
          },
          yAxis: { type: 'value', max: 100 },
          series: [
            {
              name: 'CPU',
              type: 'bar',
              data: [65, 72, 58, 81],
              itemStyle: { color: '#667eea' }
            },
            {
              name: 'Memory',
              type: 'bar',
              data: [78, 85, 69, 92],
              itemStyle: { color: '#764ba2' }
            },
            {
              name: 'Storage',
              type: 'bar',
              data: [45, 52, 38, 65],
              itemStyle: { color: '#4299e1' }
            }
          ]
        }
      }
    ];
  }

  /**
   * Monitoring dashboard widgets
   */
  private getMonitoringWidgets(): Widget[] {
    return [
      {
        id: 'system-health',
        cols: 4,
        rows: 4,
        y: 0,
        x: 0,
        title: 'System Health',
        type: 'gauge',
        chartOptions: {
          series: [
            {
              type: 'gauge',
              progress: { show: true, width: 18 },
              axisLine: { lineStyle: { width: 18 } },
              axisTick: { show: false },
              splitLine: { length: 15, lineStyle: { width: 2, color: '#999' } },
              axisLabel: { distance: 25, color: '#999', fontSize: 12 },
              anchor: { show: true, showAbove: true, size: 25, itemStyle: { borderWidth: 10 } },
              title: { show: false },
              detail: {
                valueAnimation: true,
                fontSize: 30,
                offsetCenter: [0, '70%'],
                formatter: '{value}%'
              },
              data: [{ value: 94.5 }]
            }
          ]
        }
      },
      {
        id: 'network-traffic',
        cols: 8,
        rows: 4,
        y: 0,
        x: 4,
        title: 'Network Traffic',
        type: 'line',
        chartOptions: {
          tooltip: { trigger: 'axis' },
          legend: { data: ['Inbound', 'Outbound'] },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            boundaryGap: false,
            data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00']
          },
          yAxis: { type: 'value', name: 'MB/s' },
          series: [
            {
              name: 'Inbound',
              type: 'line',
              smooth: true,
              data: [120, 132, 101, 134, 190, 230, 210],
              itemStyle: { color: '#48bb78' },
              areaStyle: { opacity: 0.3 }
            },
            {
              name: 'Outbound',
              type: 'line',
              smooth: true,
              data: [220, 182, 191, 234, 290, 330, 310],
              itemStyle: { color: '#4299e1' },
              areaStyle: { opacity: 0.3 }
            }
          ]
        }
      }
    ];
  }

  /**
   * Reports dashboard widgets
   */
  private getReportsWidgets(): Widget[] {
    return [
      {
        id: 'quarterly-report',
        cols: 12,
        rows: 5,
        y: 0,
        x: 0,
        title: 'Quarterly Performance Report',
        type: 'bar',
        chartOptions: {
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
          legend: { data: ['Q1', 'Q2', 'Q3', 'Q4'] },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'category',
            data: ['Sales', 'Marketing', 'Development', 'Support', 'Operations']
          },
          yAxis: { type: 'value' },
          series: [
            {
              name: 'Q1',
              type: 'bar',
              data: [320, 302, 301, 334, 390],
              itemStyle: { color: '#667eea' }
            },
            {
              name: 'Q2',
              type: 'bar',
              data: [220, 182, 191, 234, 290],
              itemStyle: { color: '#764ba2' }
            },
            {
              name: 'Q3',
              type: 'bar',
              data: [150, 212, 201, 154, 190],
              itemStyle: { color: '#48bb78' }
            },
            {
              name: 'Q4',
              type: 'bar',
              data: [320, 332, 301, 334, 390],
              itemStyle: { color: '#ed8936' }
            }
          ]
        }
      }
    ];
  }

  toggleSidebar(): void {
    this.sidebarExpanded.update(expanded => !expanded);
    
    setTimeout(() => {
      if (this.gridsterOptions['api']) {
        this.gridsterOptions['api'].optionsChanged!();
      }
    }, 300);
  }

  switchDashboard(dashboardId: string): void {
    this.activeDashboard.set(dashboardId);
    this.loadDashboardWidgets(dashboardId);
  }

  addWidget(): void {
    const newWidget: Widget = {
      id: `widget-${Date.now()}`,
      cols: 4,
      rows: 3,
      y: 0,
      x: 0,
      title: 'New Widget',
      type: 'bar',
      chartOptions: {
        xAxis: { type: 'category', data: ['A', 'B', 'C', 'D'] },
        yAxis: { type: 'value' },
        series: [
          {
            data: [10, 20, 30, 40],
            type: 'bar',
            itemStyle: { color: '#667eea' }
          }
        ]
      }
    };

    this.widgets.update(widgets => [...widgets, newWidget]);
  }

  removeWidget(widget: Widget): void {
    this.widgets.update(widgets => widgets.filter(w => w.id !== widget.id));
    this.chartInstances.delete(widget.id);
  }

  refreshWidget(widget: Widget): void {
    const chartInstance = this.chartInstances.get(widget.id);
    if (chartInstance) {
      chartInstance.setOption(widget.chartOptions, true);
    }
  }

  private itemChange(item: GridsterItemConfig, itemComponent: GridsterItem): void {
    console.log('Item changed:', item);
  }

  private itemResize(item: GridsterItemConfig, itemComponent: GridsterItem): void {
    console.log('Item resized:', item);
    
    const widget = this.widgets().find(w => w.id === (item as Widget).id);
    if (widget) {
      const chartInstance = this.chartInstances.get(widget.id);
      if (chartInstance) {
        setTimeout(() => {
          chartInstance.resize();
        }, 100);
      }
    }
  }

  onChartInit(chart: any, widgetId: string): void {
    this.chartInstances.set(widgetId, chart);
  }

  getActiveDashboardName(): string {
    const dashboard = this.dashboards().find(d => d.id === this.activeDashboard());
    return dashboard?.name || 'Dashboard';
  }
}
