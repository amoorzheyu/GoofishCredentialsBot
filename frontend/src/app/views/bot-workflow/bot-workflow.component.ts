import {
    Component, OnInit, OnDestroy, signal, inject,
    ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

import { ICONS } from '../../shared/icons';
import { DialogService } from '../../shared/dialog';
import { WorkflowService } from '../../core/services';
import type { Workflow } from '../../core/types';

import { NODE_TYPES, NodeConfigData, MindMapNode } from './node-configs';
import { WorkflowListComponent, NodeConfigPanelComponent } from './components';
import {
    definitionToMindMap, mindMapToDefinition, getDefaultWorkflowTemplate
} from './workflow-converter';

@Component({
    selector: 'app-bot-workflow',
    standalone: true,
    imports: [
        LucideAngularModule, FormsModule,
        WorkflowListComponent, NodeConfigPanelComponent
    ],
    templateUrl: './bot-workflow.html',
    styleUrls: ['./bot-workflow.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BotWorkflowComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('mindMapContainer') mindMapContainer!: ElementRef<HTMLDivElement>;

    private readonly workflowService = inject(WorkflowService);
    private readonly dialog = inject(DialogService);
    private readonly cdr = inject(ChangeDetectorRef);

    readonly icons = ICONS;
    readonly nodeTypes = NODE_TYPES;

    private mindMap: any = null;

    workflows = signal<Workflow[]>([]);
    loading = signal(false);
    saving = signal(false);
    editingWorkflow = signal<Workflow | null>(null);
    selectedNode = signal<any>(null);

    workflowForm = signal({
        name: '',
        description: '',
        isDefault: false,
        mindMapData: null as MindMapNode | null
    });

    nodeConfig = signal<NodeConfigData>({
        text: '',
        nodeType: 'delivery',
        deliveryMode: 'virtual',
        deliveryContent: '',
        delayMs: 0,
        delayMode: 'fixed',
        delayMinMs: 0,
        delayMaxMs: 10000,
        delayUnit: 's',
        expression: '',
        keywords: '',
        matchMode: 'contains',
        promptMessage: '',
        message: ''
    });

    ngOnInit() {
        this.loadWorkflows();
    }

    ngAfterViewInit() { }

    ngOnDestroy() {
        this.destroyMindMap();
    }

    async loadWorkflows() {
        this.loading.set(true);
        try {
            const res = await this.workflowService.getWorkflows();
            this.workflows.set(res.workflows);
        } catch (e) {
            console.error('加载流程失败', e);
        } finally {
            this.loading.set(false);
        }
    }

    createWorkflow() {
        this.editingWorkflow.set({ id: 0 } as Workflow);
        this.workflowForm.set({
            name: '',
            description: '',
            isDefault: false,
            mindMapData: getDefaultWorkflowTemplate()
        });
        this.selectedNode.set(null);
        setTimeout(() => this.initMindMap(), 100);
    }

    editWorkflow(workflow: Workflow) {
        this.editingWorkflow.set(workflow);
        this.workflowForm.set({
            name: workflow.name,
            description: workflow.description || '',
            isDefault: workflow.isDefault,
            mindMapData: definitionToMindMap(workflow.definition)
        });
        setTimeout(() => this.initMindMap(), 100);
    }

    cancelEdit() {
        this.destroyMindMap();
        this.editingWorkflow.set(null);
        this.selectedNode.set(null);
    }

    updateFormField(field: string, value: any) {
        this.workflowForm.update(f => ({ ...f, [field]: value }));
    }

    // 节点配置更新
    updateConfigField(field: keyof NodeConfigData, value: any) {
        this.nodeConfig.update(c => ({ ...c, [field]: value }));
    }

    onNodeTypeChange(value: string) {
        this.nodeConfig.update(c => ({ ...c, nodeType: value }));
        this.updateNodeConfig();
    }

    updateNodeConfig() {
        const node = this.selectedNode();
        if (!node || !this.mindMap) return;

        const config = this.nodeConfig();
        const typeConfig = NODE_TYPES[config.nodeType as keyof typeof NODE_TYPES];

        node.setData({
            text: config.text,
            nodeType: config.nodeType,
            fillColor: typeConfig?.color,
            borderColor: typeConfig?.color,
            fontColor: '#ffffff',
            config: {
                deliveryMode: config.deliveryMode,
                deliveryContent: config.deliveryContent,
                delayMs: config.delayMs,
                delayMode: config.delayMode,
                delayMinMs: config.delayMinMs,
                delayMaxMs: config.delayMaxMs,
                delayUnit: config.delayUnit,
                expression: config.expression,
                keywords: config.keywords.split(',').filter(Boolean),
                matchMode: config.matchMode,
                promptMessage: config.promptMessage,
                message: config.message
            }
        });
        this.mindMap.render();
    }

    // 思维导图操作
    async initMindMap() {
        if (!this.mindMapContainer?.nativeElement) return;

        const MindMap = (await import('simple-mind-map')).default;
        // @ts-ignore
        const Drag = (await import('simple-mind-map/src/plugins/Drag.js')).default;
        // @ts-ignore - TouchEvent 插件支持移动端触摸
        const TouchEvent = (await import('simple-mind-map/src/plugins/TouchEvent.js')).default;

        MindMap.usePlugin(Drag);
        MindMap.usePlugin(TouchEvent);

        this.mindMap = new MindMap({
            el: this.mindMapContainer.nativeElement,
            data: this.workflowForm().mindMapData || { data: { text: '根节点' }, children: [] },
            layout: 'logicalStructure',
            theme: 'default',
            themeConfig: { backgroundColor: 'transparent', lineColor: '#6366f1', lineWidth: 2 },
            scaleRatio: 0.1,
            maxZoomRatio: 300,
            minZoomRatio: 30,
            mousewheelAction: 'zoom',
            defaultInsertSecondLevelNodeText: '新节点',
            defaultInsertBelowSecondLevelNodeText: '新节点',
            autoMoveWhenMouseInEdgeOnDrag: true,
            dragPlaceholderRectFill: 'rgba(99, 102, 241, 0.3)',
            dragPlaceholderLineConfig: { color: '#6366f1', width: 2 },
            dragOpacityConfig: { cloneNodeOpacity: 0.5, beingDragNodeOpacity: 0.3 },
            // 移动端触摸支持
            enableTouchEvent: true,
            disableMouseWheelZoom: false
        } as any);

        this.mindMap.on('node_active', (_: any, activeNodeList: any[]) => {
            if (activeNodeList.length > 0) {
                this.selectedNode.set(activeNodeList[0]);
                this.loadNodeConfig(activeNodeList[0]);
            } else {
                this.selectedNode.set(null);
            }
            this.cdr.markForCheck();
        });

        this.mindMap.on('data_change', (data: MindMapNode) => {
            this.workflowForm.update(f => ({ ...f, mindMapData: data }));
        });

        this.mindMap.on('node_dragend', () => this.cdr.markForCheck());
    }

    destroyMindMap() {
        if (this.mindMap) {
            this.mindMap.destroy();
            this.mindMap = null;
        }
    }

    loadNodeConfig(node: any) {
        const data = node.getData();
        let delayMs = data.config?.delayMs ?? (data.config?.delaySeconds ?? 0) * 1000;
        let delayMinMs = data.config?.delayMinMs ?? (data.config?.delayMin ?? 0) * 1000;
        let delayMaxMs = data.config?.delayMaxMs ?? (data.config?.delayMax ?? 10) * 1000;

        this.nodeConfig.set({
            text: data.text || '',
            nodeType: data.nodeType || 'delivery',
            deliveryMode: data.config?.deliveryMode || 'virtual',
            deliveryContent: data.config?.deliveryContent || '',
            delayMs,
            delayMode: data.config?.delayMode || 'fixed',
            delayMinMs,
            delayMaxMs,
            delayUnit: data.config?.delayUnit || 's',
            expression: data.config?.expression || '',
            keywords: (data.config?.keywords || []).join(','),
            matchMode: data.config?.matchMode || 'contains',
            promptMessage: data.config?.promptMessage || '',
            message: data.config?.message || ''
        });
    }

    addNode(type: string) {
        if (!this.mindMap || !this.selectedNode()) {
            this.dialog.alert('提示', '请先选择一个节点');
            return;
        }
        const typeConfig = NODE_TYPES[type as keyof typeof NODE_TYPES];
        if (!typeConfig) return;
        this.mindMap.execCommand('INSERT_CHILD_NODE', false, [], {
            text: typeConfig.label,
            uid: `${type}_${Date.now()}`,
            nodeType: type,
            fillColor: typeConfig.color,
            borderColor: typeConfig.color,
            fontColor: '#ffffff',
            config: {}
        });
    }

    addSiblingNode(type: string) {
        const node = this.selectedNode();
        if (!this.mindMap || !node) {
            this.dialog.alert('提示', '请先选择一个节点');
            return;
        }
        if (node.isRoot) {
            this.dialog.alert('提示', '根节点不能添加兄弟节点');
            return;
        }
        const typeConfig = NODE_TYPES[type as keyof typeof NODE_TYPES];
        if (!typeConfig) return;
        this.mindMap.execCommand('INSERT_NODE', false, [], {
            text: typeConfig.label,
            uid: `${type}_${Date.now()}`,
            nodeType: type,
            fillColor: typeConfig.color,
            borderColor: typeConfig.color,
            fontColor: '#ffffff',
            config: {}
        });
    }

    addConditionBranch() {
        if (!this.mindMap || !this.selectedNode()) {
            this.dialog.alert('提示', '请先选择一个节点');
            return;
        }
        const ts = Date.now();
        this.mindMap.execCommand('INSERT_CHILD_NODE', false, [], {
            text: '条件判断',
            uid: `condition_${ts}`,
            nodeType: 'condition',
            fillColor: NODE_TYPES.condition.color,
            borderColor: NODE_TYPES.condition.color,
            fontColor: '#ffffff',
            config: { expression: '' }
        });

        setTimeout(() => {
            const condNode = this.mindMap.renderer.findNodeByUid(`condition_${ts}`);
            if (!condNode) return;
            this.mindMap.execCommand('CLEAR_ACTIVE_NODE');
            condNode.active();

            setTimeout(() => {
                this.mindMap.execCommand('INSERT_CHILD_NODE', false, [], {
                    text: 'IF: 条件成立', uid: `if_${ts}`, nodeType: 'condition',
                    fillColor: '#22c55e', borderColor: '#22c55e', fontColor: '#ffffff',
                    config: { branch: 'if' }
                });
                setTimeout(() => {
                    const ifNode = this.mindMap.renderer.findNodeByUid(`if_${ts}`);
                    if (!ifNode) return;
                    this.mindMap.execCommand('CLEAR_ACTIVE_NODE');
                    ifNode.active();
                    setTimeout(() => {
                        this.mindMap.execCommand('INSERT_NODE', false, [], {
                            text: 'ELSE: 条件不成立', uid: `else_${ts}`, nodeType: 'condition',
                            fillColor: '#ef4444', borderColor: '#ef4444', fontColor: '#ffffff',
                            config: { branch: 'else' }
                        });
                    }, 50);
                }, 100);
            }, 100);
        }, 100);
    }

    deleteSelectedNode() {
        const node = this.selectedNode();
        if (!this.mindMap || !node) return;
        if (node.getData().nodeType === 'trigger' && node.isRoot) {
            this.dialog.alert('提示', '不能删除触发节点');
            return;
        }
        this.mindMap.execCommand('REMOVE_NODE');
        this.selectedNode.set(null);
    }

    zoomIn() { this.mindMap?.execCommand('ZOOM_IN'); }
    zoomOut() { this.mindMap?.execCommand('ZOOM_OUT'); }
    resetView() { this.mindMap?.execCommand('RESET'); }

    async saveWorkflow() {
        const form = this.workflowForm();
        if (!form.name.trim()) {
            await this.dialog.alert('提示', '请输入流程名称');
            return;
        }

        this.saving.set(true);
        try {
            const definition = mindMapToDefinition(form.mindMapData);
            const editing = this.editingWorkflow();

            if (editing && editing.id > 0) {
                await this.workflowService.updateWorkflow(editing.id, {
                    name: form.name,
                    description: form.description || undefined,
                    definition,
                    isDefault: form.isDefault
                });
            } else {
                await this.workflowService.createWorkflow({
                    name: form.name,
                    description: form.description || undefined,
                    definition,
                    isDefault: form.isDefault
                });
            }
            await this.loadWorkflows();
            this.cancelEdit();
        } catch (e) {
            console.error('保存流程失败', e);
            await this.dialog.alert('错误', '保存流程失败');
        } finally {
            this.saving.set(false);
        }
    }

    async deleteWorkflow(workflow: Workflow) {
        if (workflow.isDefault) {
            await this.dialog.alert('提示', '默认流程不能删除');
            return;
        }
        const confirmed = await this.dialog.confirm('确认删除', `确定要删除流程 "${workflow.name}" 吗？`);
        if (!confirmed) return;

        try {
            await this.workflowService.deleteWorkflow(workflow.id);
            await this.loadWorkflows();
        } catch (e) {
            console.error('删除流程失败', e);
            await this.dialog.alert('错误', '删除流程失败');
        }
    }

    getNodeTypeColor(type: string): string {
        return NODE_TYPES[type as keyof typeof NODE_TYPES]?.color || '#6b7280';
    }
}
