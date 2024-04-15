const { dia, elementTools, shapes, linkTools, util } = joint;
var graph;
var paper;
var root = [];
var models = [];
var duplicateFrame = [];
var createdConsidearitonElementIds = new Set();   //This set stores all the multi linked consideration element in which the definition button is already embedded, to prevent dup ids
var createdActivityElementIds = new Set();
var multiParentElementIds = {}
var createdActivityTargets = new Set();
var elementsAlreadyPositioned = new Set();
var scorecard = {}

//initialize
init();

function buildTheGraph(){
  var Elements = []
    fetch('./data/json-ld/graph.jsonld')
  .then(response => response.json())
   // specifying a frame allows you to set the shape of the graph you want to navigate
  .then(data => jsonld.frame(data,
    {
        "@context": {
            "name": "https://schema.org/name",
            "additionalType": "https://schema.org/additionalType",
            "description": "https://schema.org/description",
            "sunyrdaf": "https://data.suny.edu/vocabs/oried/rdaf/suny/",
            "sunyrdaf:includes": {
                "@type": "@id"
            },
            "sunyrdaf:resultsFrom": {
                "@type": "@id"
            },
            "sunyrdaf:generates": {
              "@type": "@id"
            },
            "sunyrdaf:extends": {
              "@type": "@id"
            },
            "sunyrdaf:Method":{
              "@type": "@id"
            },
            "sunyrdaf:Participant":{
              "@type": "@id"
            },
            "sunyrdaf:Activity":{
              "@type": "@id"
            },
        },
  }))
  .then(frame => {

// example of pulling a single Outcome and linked Activity from the input data file
// in reality we want to navigate the entire graph
  const frameArray = frame['@graph']
  duplicateFrame = frameArray
  frameArray.forEach(node =>{
    if(node['additionalType'] == "RdAF Stage"){
      var stage = linkNodes(node, Elements, "", "Stages")
      graph.addCells(stage)
      createTextBlock(stage, node, stage)
      root.push(stage)
      topic = node['sunyrdaf:includes']
      if(Array.isArray(topic)){
        topic.forEach(topicObj =>{
        var tools = [];
        if(topicObj){
          //Creates the topic
          var topicElement = linkNodes(topicObj, Elements, stage, "Topics")
          const width = topicElement.size().width
          const height = topicElement.size().height
          topicElement.size(width + 200, height)
          var topicElementPosition = topicElement.getBBox()
          Elements.push(topicElement)
          if(topicObj["sunyrdaf:includes"]){
            //Creates the consideration button if a topic includes consideration
            var port3 = createPort('Considerations', 'out', "100%", 40);
            // Add custom tool buttons for each port
            topicElement.addPort(port3);        // Adds a port to the element
            const considerationButton = createConsiderationButton(port3)

            considerationButton.options.x = parseInt(topicElementPosition.x) + parseInt(topicElementPosition.width) - 115
            tools.push(considerationButton)       //Create the button
          }
          var port2 = createPort('Outcomes', 'out', "100%", 20);
          // Add custom tool buttons for each port
          topicElement.addPort(port2);
          const outcomeButton = createButton(port2)
          outcomeButton.options.x = parseInt(topicElementPosition.x) + parseInt(topicElementPosition.width) - 115
          tools.push(outcomeButton)//Creates the Outcome button
          graph.addCells(topicElement);
          toolsView = new joint.dia.ToolsView({ tools: tools});
          topicElement.findView(paper).addTools(toolsView);
          checkOutcomes(topicObj, Elements, topicElement)
          createTextBlock(topicElement,topicObj, stage )
        }
      })
    }
  }
  });
  paper.setInteractivity(false);
  graph.addCells(Elements)
  // Perform layout after setting positions
  models = Elements
  layout = doLayout();
  })
}





/*
  * Create and link Outcome elements
  * @param {Object} topic - the JSON-LD topic node
  * @param {Object[]} arr - list of JointJS shapes created so far
  * @param {Object} parentNode - the JointJS shape that is the parent of this topic
  *
*/
function checkOutcomes(topic, arr, parentNode){
  //Creates all the Outcomes that are generated by the topic
  for (const key in topic){
    if(key.startsWith('sunyrdaf')){
      if(key == "sunyrdaf:generates"){
        if(Array.isArray(topic[key])){
          topic[key].forEach(outcome =>{
            const outcomeElement = linkNodes(outcome, arr, parentNode, "Outcomes")
            //Check for activities in the outcome
            checkForActivities(outcome, arr, outcomeElement)
            createTextBlock(outcomeElement, outcome, parentNode)
          })
        }else{ //Condition if the topic has generated only one outcome
          const outcomeElement = linkNodes(topic[key], arr, parentNode, "Outcomes")
          //Check for activities in the outcome
          checkForActivities(topic[key], arr, outcomeElement)
          createTextBlock(outcomeElement, topic[key], parentNode)
        }
      }else if(key == "sunyrdaf:includes"){
        //Creates consideration elements if a topic includes considerations
        checkForConsiderations(topic[key], arr, parentNode);
      }
    }
  }

}


/*
  * Create and link Consideration elements
  * @param {Object} outcome - the JSON-LD topic node
  * @param {Object[]} arr - list of JointJS shapes created so far
  * @param {Object} parentNode - the JointJS shape that is the parent of this topic
  *
*/
function checkForConsiderations(node, arr, parentNode){

  if(Array.isArray(node)){
    //Condition to handle topics that includes multiple considerations
    node.forEach(considerations =>{
      if (considerations['name'] == undefined) {
        for (const nodes of duplicateFrame) {
            if (nodes['@id'] == considerations) {
                const considerationElement = linkNodes(nodes, arr, parentNode, "Considerations");
                createTextBlock(considerationElement, nodes, parentNode)
                if(considerationElement){
                  return considerationElement;
                }else{
                  console.error("Considerations undefined")
                }
            }
        }
      }else {
          const considerationElement = linkNodes(considerations, arr, parentNode, "Considerations");
          createTextBlock(considerationElement, considerations, parentNode)
          if(considerationElement){
            return considerationElement;
          }else{
            console.error("Considerations undefined")
          }
      }
    })
  }else{ //Condition to handle topics that includes a single considerations
    if(node['name'] == undefined){
      for (const nodes of duplicateFrame) {
          if (nodes['@id'] == node) {
              const considerationElement = linkNodes(nodes, arr, parentNode, "Considerations");
              createTextBlock(considerationElement, nodes, parentNode)
              if(considerationElement){
                return considerationElement;
              }else{
                console.error("Considerations undefined")
              }
          }
      }
    }else{
      const considerationElement = linkNodes(node, arr, parentNode, "Considerations")
      createTextBlock(considerationElement, node, parentNode)
      if(considerationElement){
        return considerationElement;
      }else{
        console.error("Considerations undefined")
      }
    }
  }
}

/*
 * Create and link Activities elements
 * @param {Object} Outcome - the JSON-LD topic node
 * @param {Object[]} arr - list of JointJS shapes created so far
 * @param {Object} parentNode - the JointJS shape that is the parent of this topic
 *
 */
function checkForActivities(outcome, arr, parentNode){
  const embedButton = buttonView("Activities", parentNode)
  for (const key in outcome){
    if(key.startsWith('sunyrdaf')){
      if(key == "sunyrdaf:resultsFrom"){
        if(Array.isArray(outcome[key])){ //Conditions to create multiple activities
          outcome[key].forEach(activity =>{
            const activityElement = linkNodes(activity, arr, parentNode, "Activities")
            if(activity['sunyrdaf:extends']){
              var subTopic = checkForSubTopics(activity['sunyrdaf:extends'], arr, parentNode)
              subTopicTextBlock(subTopic, activityElement)    //Creates the textBlock for the SubTopic button in Activities
            }
            if(activity['sunyrdaf:generates']){
              checkForActivitiesTarget(activity, arr, activityElement)
            }
            if(activity['sunyrdaf:includes']){
              checkForActivitiesTarget(activity, arr, activityElement)
            }
          })
        }else{// Condition to create a single activity
          if(outcome[key]['name'] == undefined){
            duplicateFrame.forEach(activity =>{
              if(activity['@id'] == outcome[key]){
                const activityElement = linkNodes(activity, arr, parentNode, "Activities")
                if(activity['sunyrdaf:extends']){
                  var subTopic = checkForSubTopics(activity['sunyrdaf:extends'], arr, activityElement)
                  subTopicTextBlock(subTopic, activityElement)    //Creates the textBlock for the SubTopic button in Activities
                }
                if(activity['sunyrdaf:generates']){
                  checkForActivitiesTarget(activity, arr, activityElement)
                }
                if(activity['sunyrdaf:includes']){
                  checkForActivitiesTarget(activity, arr, activityElement)
                }
              }
            })
          }else{
            var activity = outcome[key]
            const activityElement = linkNodes(activity, arr, parentNode, "Activities")
            if(activity['sunyrdaf:extends']){
              var subTopic = checkForSubTopics(activity['sunyrdaf:extends'], arr, parentNode)
              subTopicTextBlock(subTopic, activityElement)    //Creates the textBlock for the SubTopic button in Activities
            }
            if(activity['sunyrdaf:generates']){
              checkForActivitiesTarget(activity, arr, activityElement)
            }
            if(activity['sunyrdaf:includes']){
              checkForActivitiesTarget(activity, arr, activityElement)
            }
          }
        }
      }else if(key == "sunyrdaf:includes"){
        const consideration = checkForConsiderations(outcome[key], arr, parentNode)
        if(consideration){
        }else{
          //Error displayed is Considerations Undefined (Just for Debugging)
        }
      }else if(key == "sunyrdaf:extends"){
        //Instead Of creating an element and a link for the subtopic, we have just used
        //the Name, description and the catalog number to define the subtopic into a textblock
        var subTopic = checkForSubTopics(outcome[key], arr, parentNode);
        if(subTopic != undefined){
          //This creates the si
          subTopicTextBlock(subTopic, parentNode)
        }
      }
    }
  }
}

/*
 * Create and link Subtopics elements
 * @param {Object} topic - the JSON-LD topic node
 * @param {Object[]} arr - list of JointJS shapes created so far
 * @param {Object} parentNode - the JointJS shape that is the parent of this topic
 *
 */
function checkForSubTopics(node, arr, parentNode){
  if(node['name'] || node['description']){
    const subTopic = linkNodes(node, arr, parentNode, "Subtopic")
    return subTopic;
  }else {
    for (const nodes of duplicateFrame) {
      if (nodes['@id'] == node) {
        node = nodes
        const subTopic = linkNodes(node, arr, parentNode, "Subtopic")
        return subTopic;
      }
    }
  }
}

/*
This function takes the nodes and links it
* Create and add node for the JointJS graph and link it to its parent
* @param {Object} childNode - an object in the JSON-LD graph
* @param {Object[]} arr - the list of elements in the JointJS graph
* @param {Object} parentNode - the parent object in the JSON-LD graph
* @param {string} typeOfNode - the name of the type of node we are linking
* @return the newly created node
*/
function linkNodes(childNode, arr, parentNode, typeOfNode){
  if(typeOfNode == "Stages"){
    var stage = createStage(childNode['@id'], childNode['name'])
    stage.prop('name/first', "Stages")
    arr.push(stage)
    return stage;
  }
  if(typeOfNode == "Topics"){
    var topicElement = createTopics(childNode['@id'], childNode['name'])
    topicElement.prop('name/first', "Topics")
    var linkStageToTopics = makeLink(parentNode, topicElement)
    arr.push(topicElement, linkStageToTopics)
    return topicElement;
  }
  if(typeOfNode == "Outcomes"){
    var outcomeElement = createOutcomes(childNode['@id'], childNode['name'])
    outcomeElement.prop('name/first', "Outcomes")
    var linkTopicToOutcome = makeLink(parentNode, outcomeElement)
    arr.push(outcomeElement, linkTopicToOutcome)
    return outcomeElement;
  }
  if(typeOfNode == "Activities"){
    var activityElement;
    if(createdActivityElementIds.has(childNode['@id'])){
      console.warn(`Element with ID '${childNode['name']}' already exists. Skipping creation.`);
      if(multiParentElementIds[childNode['@id']]){
        activityElement = multiParentElementIds[childNode['@id']];
        activityElement.prop('name/first', "Activities")
        var linkOutcomeToActivity = makeLink(parentNode, activityElement)
        arr.push(activityElement, linkOutcomeToActivity)
      }
    }else{
      activityElement = createActivities(childNode['@id'], childNode['name'])
      activityElement.prop('name/first', "Activities")
      const portNameList = ['Participants', 'Methods', "Roles", "Resources", "Outputs", "RDaF Subtopic", "Considerations"]
      const buttonview = buttonView(portNameList, activityElement)
      var elementBBox = activityElement.getBBox()
      createdActivityElementIds.add(childNode['@id']);
      multiParentElementIds[childNode['@id']] = activityElement
      var linkOutcomeToActivity = makeLink(parentNode, activityElement)
      buttonview.tools[6].options.x = "85%"
      buttonview.tools[6].options.y = "85%"
      buttonview.tools[6].options.x = parseInt(elementBBox.x) + parseInt(elementBBox.width) - 115
      arr.push(activityElement, linkOutcomeToActivity)
    }
    return activityElement;
  }
  if(typeOfNode == "Considerations"){
    var considerationElement
    if (createdConsidearitonElementIds.has(childNode['@id'])) {
      if(multiParentElementIds[childNode['@id']]){
        considerationElement = multiParentElementIds[childNode['@id']];
        considerationElement.prop('name/first', "Considerations")
        var linkOutcomeToConsideration = makeLink(parentNode, considerationElement)
        arr.push(considerationElement, linkOutcomeToConsideration)
      }
    }else{
      considerationElement = createConsiderations(childNode['@id'], childNode['name'])
      considerationElement.prop('name/first', "Considerations")
      const embedButton = buttonView("Definition", considerationElement)
      createTextBlock(considerationElement, childNode['@id'], parentNode)
      createdConsidearitonElementIds.add(childNode['@id'])
      multiParentElementIds[childNode['@id']] = considerationElement
      var linkOutcomeToConsideration = makeLink(parentNode, considerationElement)
      arr.push(considerationElement, linkOutcomeToConsideration)
    }
    return considerationElement;
  }
  if(typeOfNode == "Subtopic"){
    var id = childNode['@id'];
    var parts = id.split("/");
    var category = parts[parts.length - 1];
    let description;
    if(childNode['name'] == undefined){
      description = category + ": " + childNode['description']
    }else if(childNode['description'] == undefined){
      description = category + ": " + childNode['name']
    }else{
      description = category + ": " + childNode['name'] + ": " + childNode['description']
    }
    return description
  }

  if(typeOfNode == "Outputs"){
    var outputElement;
    if(createdActivityTargets.has(childNode['@id'])){
      //console.warn(`Element with ID '${childNode['name']}' already exists. Skipping creation.`);
      if(multiParentElementIds[childNode['@id']]){
        outputElement = multiParentElementIds[childNode['@id']];
        outputElement.prop('name/first', "Outputs")
        var linkOutputToActivity = makeLink(parentNode, outputElement)
        arr.push(linkOutputToActivity)
      }
    }else{
      outputElement = createOutputs(childNode['@id'], childNode['name'])
      createdActivityTargets.add(childNode['@id'])
      multiParentElementIds[childNode['@id']] = outputElement
      outputElement.prop('name/first', "Outputs")
      var linkOutputToActivity = makeLink(parentNode, outputElement)
      createTextBlock(outputElement, childNode['@id'], parentNode)
      arr.push(outputElement, linkOutputToActivity)
    }
    return outputElement;
  }
  if(typeOfNode == "Methods"){
    let methodElement;
    if(createdActivityTargets.has(childNode['@id'])){
      //console.warn(`Element with ID '${childNode['name']}' already exists. Skipping creation.`);
      if(multiParentElementIds[childNode['@id']]){
        methodElement = multiParentElementIds[childNode['@id']];
        methodElement.prop('name/first', "Methods")
        var linkMethodToActivity = makeLink(parentNode, methodElement)
        arr.push(linkMethodToActivity)
      }
    }else{
      methodElement = createMethods(childNode['@id'], childNode['name'])
      methodElement.prop('name/first', "Methods")
      var linkMethodToActivity = makeLink(parentNode, methodElement)
      createdActivityTargets.add(childNode['@id'])
      multiParentElementIds[childNode['@id']] = methodElement
      createTextBlock(methodElement, childNode['@id'], parentNode)
      arr.push(methodElement, linkMethodToActivity)
    }
    return methodElement;
  }
  if(typeOfNode == "Participants"){
    let participantElement;
    if(createdActivityTargets.has(childNode['@id'])){
      //console.warn(`Element with ID '${childNode['name']}' already exists. Skipping creation.`);
      if((multiParentElementIds[childNode['@id']])){
        participantElement = multiParentElementIds[childNode['@id']];
        participantElement.prop('name/first', "Participants")
        var linkParticipantToActivity = makeLink(parentNode, participantElement)
        arr.push(participantElement,linkParticipantToActivity)
      }
    }else{
      participantElement = createParticipants(childNode['@id'], childNode['name'])
      participantElement.prop('name/first', "Participants")
      var linkParticipantToActivity = makeLink(parentNode, participantElement)
      createdActivityTargets.add(childNode['@id'])
      multiParentElementIds[childNode['@id']] = participantElement
      createTextBlock(participantElement, childNode['@id'], parentNode)
      arr.push(participantElement, linkParticipantToActivity)
    }
    return participantElement;
  }
  if(typeOfNode == "Roles"){
    let roleElement;
    if(createdActivityTargets.has(childNode['@id'])){
      //console.warn(`Element with ID '${childNode['name']}' already exists. Skipping creation.`);
      if((multiParentElementIds[childNode['@id']])){
        roleElement =  multiParentElementIds[childNode['@id']];
        createTextBlock(roleElement, childNode['@id'], parentNode)
        roleElement.prop('name/first', "Roles")
        var linkRoleToActivity = makeLink(parentNode, roleElement)
        arr.push(linkRoleToActivity)
      }
    }else{
      roleElement = createRoles(childNode['@id'], childNode['name'])
      roleElement.prop('name/first', "Roles")
      createTextBlock(roleElement, childNode['@id'], parentNode)
      createdActivityTargets.add(childNode['@id'])
      multiParentElementIds[childNode['@id']] = roleElement
      var linkRoleToActivity = makeLink(parentNode, roleElement)
      arr.push(roleElement, linkRoleToActivity)
    }
    return roleElement;
  }
  if(typeOfNode == "Resources"){
    let resourceElement;
    if(createdActivityTargets.has(childNode['@id'])){
      //console.warn(`Element with ID '${childNode['name']}' already exists. Skipping creation.`);
      if((multiParentElementIds[childNode['@id']])){
        resourceElement =  multiParentElementIds[childNode['@id']];
        resourceElement.prop('name/first', "Resources")
        var linkResourceToActivity = makeLink(parentNode, resourceElement)
        arr.push(linkResourceToActivity)
      }
    }else{
      resourceElement = createResources(childNode['@id'], childNode['name'])
      createdActivityTargets.add(childNode['@id'])
      multiParentElementIds[childNode['@id']] = resourceElement
      resourceElement.prop('name/first', "Resources")
      resourceElement.prop('resource/Link', childNode['@id'])
      var linkResourceToActivity = makeLink(parentNode, resourceElement)
      createTextBlock(resourceElement, childNode['@id'], parentNode)
      arr.push(resourceElement, linkResourceToActivity)
    }
    return resourceElement;
  }
}



function doLayout() {
  // Apply layout using DirectedGraph plugin
  var visibleElements = []
  //Checks for the visible elements on the graph when an event occurs and adds it to the layout
  var manualLayoutElements = []
  models.forEach(el =>{
    if(!el.get('hidden')){
      visibleElements.push(el)
    }
  })
  layout = joint.layout.DirectedGraph.layout(visibleElements, {
    setVertices: false,
    rankDir: 'LR',
    marginX: 50, // Add margin to the left and right of the graph
    marginY: 0, // Add margin to the top and bottom of the graph
    resizeClusters: false,
    setPosition: (element, position) => {
      // Align elements to the left by setting their x-coordinate
      setElementsPosition(element, position)
    }
  });
  changePaperSize();
  setRootToFix();       //Sets the position of the root elements
  setLinkVertices();    //Sets the vertices that is, marks the points where the links should route from
}



function init(){
// Create a new directed graph


graph = new dia.Graph({}, { cellNamespace: shapes });

// Create a new paper, which is a wrapper around SVG element
paper = new dia.Paper({
  interactive: { vertexAdd: false }, // disable default vertexAdd interaction
  el: document.getElementById('graph-container'),
  model: graph,
  interactive: { vertexAdd: false }, // disable default vertexAdd interaction,
  width: window.innerWidth, //window.innerWidth,
  height: window.innerHeight,//window.innerHeight,
  gridSize: 10,
  perpendicularLinks: true,
  drawGrid: true,
  background: {
    color: '#f9f9f9'
  },
  defaultLinkAnchor: {
    name: 'connectionLength'
  },
  interactive: {
      linkMove: false,
      labelMove: false
  },
  connectionPoint: {
    name: 'boundary',
    args: {
        sticky: true
    }
  },
  async: true,
  //Viewport function supports collapsing/uncollapsing behaviour on paper
  viewport: function(view) {
    // Return true if model is not hidden
    return !view.model.get('hidden');
  }
});
  var paperElement = document.getElementById('graph-container');
  paperElement.style.border = "5px solid #000000";
  buildTheGraph();
}



