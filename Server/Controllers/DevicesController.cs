using gameroombookingsys.DTOs;
using gameroombookingsys.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using Microsoft.AspNetCore.Authorization;

namespace gameroombookingsys.Controllers
{
    [ApiController]
    [Route("api/devices")]
    public class DevicesController : ControllerBase
    {
        private readonly IDevicesService _devicesService;

        public DevicesController(IDevicesService devicesService)
        {
            _devicesService = devicesService;
        }

        // POST api/devices
        [HttpPost("adddevice")]
        [Authorize(Policy = "Admin")]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "AddDevice")]
        public async Task<ActionResult<DeviceDto>> AddDevice([FromBody] DeviceDto deviceDto)
        {
            try
            {
                var device = await _devicesService.AddDevice(deviceDto);
                return Ok(device);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // PUT api/devices/{id}
        [HttpPut("device/{id}")]
        [Authorize(Policy = "Admin")]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "UpdateDevice")]
        public async Task<ActionResult<DeviceDto>> UpdateDevice(int id, [FromBody] DeviceDto deviceDto)
        {
            try
            {
                deviceDto.Id = id;
                var updatedDevice = await _devicesService.UpdateDevice(deviceDto);
                return Ok(updatedDevice);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // DELETE api/devices/{id}
        [HttpDelete("device/{id}")]
        [Authorize(Policy = "Admin")]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "DeleteDevice")]
        public async Task<ActionResult<DeviceDto>> DeleteDevice(int id)
        {
            try
            {
                var deletedDevice = await _devicesService.DeleteDevice(id);
                return Ok(deletedDevice);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/devices/{id}
        [HttpGet("device/{id}")]
        [ProducesResponseType(typeof(DeviceDto), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetDeviceById")]
        public async Task<ActionResult<DeviceDto>> GetDeviceById(int id)
        {
            try
            {
                var device = await _devicesService.GetDeviceById(id);
                return Ok(device);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { Message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/devices
        [HttpGet]
        [ProducesResponseType(typeof(List<DeviceDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetAllDevices")]
        public async Task<ActionResult<List<DeviceDto>>> GetAllDevices()
        {
            try
            {
                var devices = await _devicesService.GetAllDevices();
                return Ok(devices);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/devices/available
        [HttpGet("availabledevices")]
        [ProducesResponseType(typeof(List<DeviceDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetAvailableDevices")]
        public async Task<ActionResult<List<DeviceDto>>> GetAvailableDevices()
        {
            try
            {
                var devices = await _devicesService.GetAvailableDevices();
                return Ok(devices);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }

        // GET api/devices/unavailable
        [HttpGet("unavailabledevices")]
        [ProducesResponseType(typeof(List<DeviceDto>), StatusCodes.Status200OK)]
        [SwaggerOperation(OperationId = "GetUnavailableDevices")]
        public async Task<ActionResult<List<DeviceDto>>> GetUnavailableDevices()
        {
            try
            {
                var devices = await _devicesService.GetUnavailableDevices();
                return Ok(devices);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { Message = ex.Message });
            }
        }
    }
}