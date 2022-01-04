const express = require("express");
const { v4: uuidv4 } = require("uuid");

const app = express();

app.use(express.json());

const customers = [];

// Middleware
function MiddlewareVerifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);

  if (!customer) {
    return response.status(400).json({ error: "Customer not found " });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operand) => {
    if (operand.type === "credit") {
      return acc + operand.amount;
    } else {
      return acc - operand.amount;
    }
  }, 0);

  return balance;
}

app.post("/account", (request, response) => {
  const { cpf, name } = request.body;

  const customersAlreadyExist = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customersAlreadyExist) {
    return response.status(400).json({ error: "Customer already exists" });
  }

  customers.push({
    name,
    cpf,
    id: uuidv4(),
    statement: [],
  });

  console.log(customers);
  return response.status(201).send();
});

// app.use(MiddlewareVerifyIfExistsAccountCPF);

app.get(
  "/statement",
  MiddlewareVerifyIfExistsAccountCPF,
  (request, response) => {
    const { customer } = request;

    return response.status(200).json(customer.statement);
  }
);

app.post(
  "/deposit",
  MiddlewareVerifyIfExistsAccountCPF,
  (request, response) => {
    const { amount, description } = request.body;

    const { customer } = request;

    const statementOperation = {
      description,
      amount,
      created_at: new Date(),
      type: "credit",
    };

    customer.statement.push(statementOperation);

    return response.status(201).send();
  }
);

app.post(
  "/withdraw",
  MiddlewareVerifyIfExistsAccountCPF,
  (request, response) => {
    const { amount } = request.body;

    const { customer } = request;

    const balance = getBalance(customer.statement);

    if (balance < amount) {
      return response.status(400).json({ error: "Insufient funds!" });
    }

    const stateOperation = {
      amount,
      created_at: new Date(),
      type: "debit",
    };

    customer.statement.push(stateOperation);

    return response.status(201).send();
  }
);

app.get(
  "/statement/date",
  MiddlewareVerifyIfExistsAccountCPF,
  (request, response) => {
    const { customer } = request;
    const { date } = request.query;

    const dateFormat = new Date(date + " 00:00");

    const statement = customer.statement.filter(
      (state) =>
        state.created_at.toDateString() === new Date(dateFormat).toDateString()
    );

    return response.status(200).json(statement);
  }
);

app.put("/account", MiddlewareVerifyIfExistsAccountCPF, (request, response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(200).json(customer);
});

app.get("/account", MiddlewareVerifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  return response.status(200).json(customer);
});

app.get("/accounts", (request, response) => {
  return response.status(200).json(customers);
});

app.delete(
  "/account",
  MiddlewareVerifyIfExistsAccountCPF,
  (request, response) => {
    const { customer } = request;

    customers.splice(customer, 1);

    return response.status(200).json(customers);
  }
);

app.get("/balance", MiddlewareVerifyIfExistsAccountCPF, (request, response) => {
  const { customer } = request;

  const balance = getBalance(customer.statement);

  return response.status(200).json({ balance });
});

app.listen(3333);
