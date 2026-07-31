const allowedTables = new Set(["clients", "employees"]);

export function createPeopleRepository(database) {
  const assertTable = (table) => {
    if (!allowedTables.has(table)) throw new Error("Ressource inconnue.");
  };

  return {
    async findAll(table) {
      assertTable(table);
      const result = await database.query(
        `select id,first_name as "firstName",last_name as "lastName" from ${table} order by last_name,first_name`,
      );
      return result.rows;
    },
    async exists(table, id) {
      assertTable(table);
      const result = await database.query(
        `select id from ${table} where id=$1`,
        [id],
      );
      return result.rowCount > 0;
    },
    async create(table, person) {
      assertTable(table);
      const result = await database.query(
        `insert into ${table}(first_name,last_name) values($1,$2) returning id,first_name as "firstName",last_name as "lastName"`,
        [person.firstName, person.lastName],
      );
      return result.rows[0];
    },
  };
}
