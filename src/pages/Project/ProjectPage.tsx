
import ProjectView from '../Projects/ProjectView';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

export default function ProjectPage() {
    return (
        <DndProvider backend={HTML5Backend}>
            <ProjectView />
        </DndProvider>
    );
}
