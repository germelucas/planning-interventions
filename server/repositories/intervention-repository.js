const columns =
  'id,client_id as "clientId",employee_id as "employeeId",start_at as "startAt",end_at as "endAt"';

export function createInterventionRepository(database) {
  return {
    async findAll() {
      const result = await database.query(
        `select i.id,i.client_id as "clientId",i.employee_id as "employeeId",i.start_at as "startAt",i.end_at as "endAt",c.first_name as "clientFirstName",c.last_name as "clientLastName",e.first_name as "employeeFirstName",e.last_name as "employeeLastName" from interventions i join clients c on c.id=i.client_id join employees e on e.id=i.employee_id order by i.start_at`,
      );
      return result.rows;
    },
    async findById(id) {
      const result = await database.query(
        `select ${columns} from interventions where id=$1`,
        [id],
      );
      return result.rows[0] ?? null;
    },
    async findOverlap({ employeeId, startAt, endAt, excludedId = null }) {
      const result = await database.query(
        "select id from interventions where employee_id=$1 and start_at<$2 and end_at>$3 and ($4::bigint is null or id<>$4)",
        [employeeId, endAt, startAt, excludedId],
      );
      return result.rows[0] ?? null;
    },
    async create(value) {
      const result = await database.query(
        `insert into interventions(client_id,employee_id,start_at,end_at) values($1,$2,$3,$4) returning ${columns}`,
        [value.clientId, value.employeeId, value.startAt, value.endAt],
      );
      return result.rows[0];
    },
    async update(id, value) {
      const result = await database.query(
        `update interventions set client_id=$1,employee_id=$2,start_at=$3,end_at=$4 where id=$5 returning ${columns}`,
        [value.clientId, value.employeeId, value.startAt, value.endAt, id],
      );
      return result.rows[0] ?? null;
    },
    async remove(id) {
      const result = await database.query(
        "delete from interventions where id=$1 returning id",
        [id],
      );
      return result.rowCount > 0;
    },
  };
}
