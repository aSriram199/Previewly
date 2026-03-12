import { FileItem, Step, StepType } from '../types';

/**
 * Applies all pending CreateFile steps to the existing file tree.
 * Returns a new file tree with the files added/updated, and marks all steps as completed.
 */
export function buildFileTree(
    steps: Step[],
    existingFiles: FileItem[]
): { files: FileItem[]; changed: boolean } {
    const pendingCreateSteps = steps.filter(
        (s) => s.status === 'pending' && s.type === StepType.CreateFile
    );

    if (pendingCreateSteps.length === 0) {
        return { files: existingFiles, changed: false };
    }

    let rootFiles = [...existingFiles];

    for (const step of pendingCreateSteps) {
        const parsedPath = step.path?.split('/').filter(Boolean) ?? [];
        if (parsedPath.length === 0) continue;

        rootFiles = insertFile(rootFiles, parsedPath, step.code ?? '');
    }

    return { files: rootFiles, changed: true };
}

function insertFile(files: FileItem[], pathSegments: string[], content: string): FileItem[] {
    const [head, ...rest] = pathSegments;
    const currentPath = `/${head}`;

    if (rest.length === 0) {
        // Leaf: create or update the file
        const exists = files.find((f) => f.name === head && f.type === 'file');
        if (exists) {
            return files.map((f) => (f.name === head && f.type === 'file' ? { ...f, content } : f));
        }
        return [...files, { name: head, type: 'file', path: currentPath, content }];
    }

    // Folder: find or create it, then recurse
    const existingFolder = files.find((f) => f.name === head && f.type === 'folder');
    if (existingFolder) {
        return files.map((f) => {
            if (f.name === head && f.type === 'folder') {
                return { ...f, children: insertFile(f.children ?? [], rest, content) };
            }
            return f;
        });
    }

    return [
        ...files,
        {
            name: head,
            type: 'folder',
            path: currentPath,
            children: insertFile([], rest, content),
        },
    ];
}
