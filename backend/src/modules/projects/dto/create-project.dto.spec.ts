import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateProjectDto } from "./create-project.dto";
import { UpdateProjectDto } from "./update-project.dto";

const base = {
  description: "Test project",
  projectTypeId: "type-1",
  clientId: "client-1",
};

const errorsFor = async (cls: any, extra: Record<string, unknown>) => {
  const dto = plainToInstance(cls, { ...base, ...extra });
  const errors = await validate(dto as object);
  return { dto: dto as any, props: errors.map((e) => e.property) };
};

describe("Project DTO dates", () => {
  it("accepts date-only startDate/endDate and converts to the start of the WIB day", async () => {
    const { dto, props } = await errorsFor(CreateProjectDto, {
      startDate: "2026-10-01",
      endDate: "2026-10-31",
    });
    expect(props).not.toContain("startDate");
    expect(props).not.toContain("endDate");
    // WIB midnight = 17:00 UTC of the previous day
    expect(dto.startDate).toBe("2026-09-30T17:00:00.000Z");
    expect(dto.endDate).toBe("2026-10-30T17:00:00.000Z");
    expect(Number.isNaN(new Date(dto.startDate).getTime())).toBe(false);
  });

  it("keeps full ISO datetimes untouched", async () => {
    const { dto, props } = await errorsFor(CreateProjectDto, {
      startDate: "2026-10-01T09:30:00.000Z",
    });
    expect(props).not.toContain("startDate");
    expect(dto.startDate).toBe("2026-10-01T09:30:00.000Z");
  });

  it.each(["not-a-date", "2026-02-30", "2026-13-01", "2026-10-01T99:00:00Z"])(
    "rejects invalid date %s with a validation error (400, not 500)",
    async (bad) => {
      const { props } = await errorsFor(CreateProjectDto, { startDate: bad, endDate: bad });
      expect(props).toEqual(expect.arrayContaining(["startDate", "endDate"]));
    },
  );

  it("applies the same conversion on update", async () => {
    const { dto, props } = await errorsFor(UpdateProjectDto, { endDate: "2026-12-25" });
    expect(props).not.toContain("endDate");
    expect(dto.endDate).toBe("2026-12-24T17:00:00.000Z");
  });
});
