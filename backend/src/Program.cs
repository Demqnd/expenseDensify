using System.Text;
using expenseKubex.Config;
using expenseKubex.Data;
using expenseKubex.Models;
using expenseKubex.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your JWT token. Example: eyJhbGciOi..."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document, null)] = new List<string>()
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:3001", "http://localhost:3003")
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.Configure<JwtSettings>(builder.Configuration.GetSection("JwtSettings"));
builder.Services.Configure<GmailSmtpSettings>(builder.Configuration.GetSection("GmailSmtpSettings"));

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is missing.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));
builder.Services.AddHttpClient("OcrService", client =>
{
    client.Timeout = TimeSpan.FromSeconds(45);
});
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IEmailSender, GmailSmtpEmailSender>();

var jwtSettings = builder.Configuration.GetSection("JwtSettings").Get<JwtSettings>()
    ?? throw new InvalidOperationException("JwtSettings configuration is missing.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
        };
    });

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
    dbContext.Database.ExecuteSqlRaw($"ALTER TABLE expenses ADD COLUMN IF NOT EXISTS \"Status\" character varying(20) NOT NULL DEFAULT '{Expense.DraftStatus}';");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS ""ReviewedAtUtc"" timestamp with time zone NULL;
    ");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS ""ReviewedByUserId"" uuid NULL;
    ");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE expenses
        ADD COLUMN IF NOT EXISTS ""ReviewComment"" character varying(500) NULL;
    ");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS ""Role"" character varying(30) NOT NULL DEFAULT 'Employee';
    ");

    await dbContext.Database.ExecuteSqlRawAsync(@"
        UPDATE users
        SET ""Role"" = 'Employee'
        WHERE ""Role"" IS NULL OR ""Role"" = '';
    ");

    await dbContext.Database.ExecuteSqlRawAsync(@"
        CREATE TABLE IF NOT EXISTS roles (
            ""Id"" SERIAL PRIMARY KEY,
            ""Name"" character varying(50) NOT NULL,
            ""Description"" character varying(255) NULL,
            ""CreatedAtUtc"" timestamp with time zone NOT NULL DEFAULT NOW(),
            CONSTRAINT ""roles_name_unique"" UNIQUE (""Name"")
        );
    ");

    // Add permission columns if they don't yet exist (idempotent).
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE roles
        ADD COLUMN IF NOT EXISTS ""CanInviteUsers"" boolean NOT NULL DEFAULT FALSE;
    ");
    await dbContext.Database.ExecuteSqlRawAsync(@"
        ALTER TABLE roles
        ADD COLUMN IF NOT EXISTS ""CanChangeRoles"" boolean NOT NULL DEFAULT FALSE;
    ");

    if (!await dbContext.Roles.AnyAsync())
    {
        dbContext.Roles.AddRange(
            new AppRole { Name = UserRoles.Employee, Description = "Standard employee access",             CanInviteUsers = false, CanChangeRoles = false, CreatedAtUtc = DateTime.UtcNow },
            new AppRole { Name = UserRoles.Manager,  Description = "Can review and approve team expenses", CanInviteUsers = false, CanChangeRoles = false, CreatedAtUtc = DateTime.UtcNow },
            new AppRole { Name = UserRoles.Hr,       Description = "HR department access",                 CanInviteUsers = true,  CanChangeRoles = false, CreatedAtUtc = DateTime.UtcNow },
            new AppRole { Name = UserRoles.Finance,  Description = "Finance department access",            CanInviteUsers = false, CanChangeRoles = false, CreatedAtUtc = DateTime.UtcNow },
            new AppRole { Name = UserRoles.Admin,    Description = "Full system administration access",    CanInviteUsers = true,  CanChangeRoles = true,  CreatedAtUtc = DateTime.UtcNow }
        );
        await dbContext.SaveChangesAsync();
    }
    else
    {
        // Ensure the Admin role always has full permissions even if already seeded.
        var adminRole = await dbContext.Roles.FirstOrDefaultAsync(r =>
            r.Name.ToLower() == UserRoles.Admin.ToLower());
        if (adminRole is not null && (!adminRole.CanInviteUsers || !adminRole.CanChangeRoles))
        {
            adminRole.CanInviteUsers = true;
            adminRole.CanChangeRoles = true;
            await dbContext.SaveChangesAsync();
        }
    }
}

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
