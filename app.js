const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const { format, isValid, parseISO } = require("date-fns");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("server is running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};
const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

//API 1

app.get("/todos/", async (request, response) => {
  const { search_q = "", category, priority, status } = request.query;
  let getTOdoQuery = "";
  let dbResponse = null;
  if (
    hasStatusProperty(request.query) &&
    !["TO DO", "IN PROGRESS", "DONE"].includes(status)
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    hasPriorityProperty(request.query) &&
    !["HIGH", "MEDIUM", "LOW"].includes(priority)
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    hasCategoryProperty(request.query) &&
    !["WORK", "HOME", "LEARNING"].includes(category)
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    switch (true) {
      case hasStatusProperty(request.query):
        getTOdoQuery = `
          SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND status='${status}';
          `;
        break;
      case hasPriorityProperty(request.query):
        getTOdoQuery = `
          SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority='${priority}';
          `;
        break;
      case hasCategoryProperty(request.query):
        getTOdoQuery = `
          SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category='${category}';
          `;
        break;
      case hasPriorityAndStatusProperties(request.query):
        getTOdoQuery = `
          SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND priority='${priority}' AND status='${status}';
          `;
        break;
      case hasCategoryAndStatusProperties(request.query):
        getTOdoQuery = `
          SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category='${category}' AND status='${status}';
          `;
        break;
      case hasCategoryAndPriorityProperties(request.query):
        getTOdoQuery = `
          SELECT * FROM todo WHERE todo LIKE '%${search_q}%' AND category='${category}' AND priority='${priority}';
          `;
        break;
      default:
        getTOdoQuery = `
          SELECT * FROM todo WHERE  todo LIKE '%${search_q}%';
          `;
    }
    dbResponse = await db.all(getTOdoQuery);
    response.send(dbResponse);
  }
});

//API 2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  getToDoQuery = `
    SELECT * FROM todo WHERE id=${todoId};
    `;
  const dbResponse = await db.get(getToDoQuery);
  response.send(dbResponse);
});

//API 3

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  if (!isValid(parseISO(date))) {
    response.status(400);
    response.send("Invalid Due Date");
    return;
  }

  const parsedDate = parseISO(date);
  const formattedDate = format(parsedDate, "yyyy-MM-dd");

  const newDate = '"' + formattedDate + '"';
  getAgendaQuery = `
    SELECT * FROM todo WHERE due_date=${newDate};
  `;

  const dbResponse = await db.all(getAgendaQuery);
  response.send(dbResponse);
});

//API 4

app.post("/todos/", async (request, response) => {
  const todoDetails = request.body;
  const { id, todo, priority, status, category, dueDate } = todoDetails;
  if (
    hasStatusProperty(request.body) &&
    !["TO DO", "IN PROGRESS", "DONE"].includes(status)
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    hasPriorityProperty(request.body) &&
    !["HIGH", "MEDIUM", "LOW"].includes(priority)
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    hasCategoryProperty(request.body) &&
    !["WORK", "HOME", "LEARNING"].includes(category)
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (!isValid(parseISO(dueDate))) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const addToDoQuery = `
  INSERT INTO todo(id,todo,priority,status,category,due_date)
  VALUES(${id},'${todo}','${priority}','${status}','${category}','${dueDate}');
  `;
    await db.run(addToDoQuery);
    response.send("Todo Successfully Added");
  }
});

//API 5
app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;
  let updateMessage = "";

  switch (true) {
    case requestBody.status !== undefined:
      updateColumn = "status";
      updateMessage = "Status Updated";
      break;
    case requestBody.priority !== undefined:
      updateColumn = "priority";
      updateMessage = "Priority Updated";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "todo";
      updateMessage = "Todo Updated";
      break;
    case requestBody.category !== undefined:
      updateColumn = "category";
      updateMessage = "Category Updated";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "due_date";
      updateMessage = "Due Date Updated";
      break;
  }

  if (updateColumn !== undefined) {
    const previousTodoQuery = `
      SELECT *
      FROM todo
      WHERE id = ${todoId};`;
    const previousTodo = await db.get(previousTodoQuery);

    if (!previousTodo) {
      response.status(404);
      response.send("Todo not found");
      return;
    }

    const {
      todo = previousTodo.todo,
      priority = previousTodo.priority,
      status = previousTodo.status,
      category = previousTodo.category,
      due_date = previousTodo.due_date,
    } = request.body;
    if (
      updateColumn === "status" &&
      !["TO DO", "IN PROGRESS", "DONE"].includes(status)
    ) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
    if (
      updateColumn === "priority" &&
      !["HIGH", "MEDIUM", "LOW"].includes(priority)
    ) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
    if (
      updateColumn === "category" &&
      !["WORK", "HOME", "LEARNING"].includes(category)
    ) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
    if (updateColumn === "due_date" && !isValid(parseISO(due_date))) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }

    const updateTodoQuery = `
        UPDATE todo
        SET ${updateColumn}='${requestBody[updateColumn]}'
        WHERE id = ${todoId};`;

    await db.run(updateTodoQuery);
    response.send(updateMessage);
  }
});

//API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
