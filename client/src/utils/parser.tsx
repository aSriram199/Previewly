import { Step, StepType } from "../types/types";

export function parseXml(response: string): Step[] {

    const xmlMatch = response.match(/<boltArtifact[^>]*>([\s\S]*?)<\/boltArtifact>/);
    
    if (!xmlMatch) {
      return [];
    }
  
    const xmlContent = xmlMatch[1];
    const steps: Step[] = [];
    let stepId = 1;
  
    // Extract artifact title
    const titleMatch = response.match(/title="([^"]*)"/);
    const artifactTitle = titleMatch ? titleMatch[1] : 'Project Files';
  
    // Add initial artifact step
    steps.push({
      id: stepId++,
      title: artifactTitle,
      description: '',
      type: StepType.CreateFolder,
      status: 'pending'
    });
  
    // Regular expression to find boltAction elements
    const actionRegex = /<boltAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/boltAction>/g;
    
    let match;
    while ((match = actionRegex.exec(xmlContent)) !== null) {
      const [, type, filePath, content] = match;
  
      if (type === 'file') {
        // Clean up the content by removing markdown code blocks if present
        let cleanContent = content.trim();
        
        // Remove markdown code blocks
        if (cleanContent.startsWith('```')) {
          const codeBlockRegex = /```(?:.*?)\n([\s\S]*?)```/;
          const blockMatch = cleanContent.match(codeBlockRegex);
          if (blockMatch && blockMatch[1]) {
            cleanContent = blockMatch[1];
          } else {
            // Try a more general regex if the specific one doesn't match
            const generalCodeBlockRegex = /```([\s\S]*?)```/;
            const generalMatch = cleanContent.match(generalCodeBlockRegex);
            if (generalMatch && generalMatch[1]) {
              // Check if the first line is a language identifier
              const lines = generalMatch[1].split('\n');
              if (lines[0].trim().match(/^[a-zA-Z]+$/)) {
                // Remove the language identifier line
                cleanContent = lines.slice(1).join('\n');
              } else {
                cleanContent = generalMatch[1];
              }
            }
          }
        }
        
        // File creation step
        steps.push({
          id: stepId++,
          title: `Create ${filePath || 'file'}`,
          description: '',
          type: StepType.CreateFile,
          status: 'pending',
          code: cleanContent,
          path: filePath
        });
      } else if (type === 'shell') {
        // Shell command step
        steps.push({
          id: stepId++,
          title: 'Run command',
          description: '',
          type: StepType.RunScript,
          status: 'pending',
          code: content.trim()
        });
      }
    }
  
    return steps;
  }
  