
// Semantic Blocks

defBlock: 
    '@def' [?!*]? ( ' '+ defName ' '* )? '{' blockBody (blockSeparator blockExtend )? '}';

defName: [^ \t\n\r\f{}]+;

blockSeperator: '='{3,};

blockBody: blockContent;

blockExtend: blockContent;

